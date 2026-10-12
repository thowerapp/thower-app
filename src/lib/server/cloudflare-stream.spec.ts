import { afterEach, describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => ({ id: 'acct', token: 'tok' }));
vi.mock('$env/dynamic/private', () => ({ env: {} }));
vi.mock('$env/static/private', () => ({
	get CLOUDFLARE_ACCOUNT_ID() {
		return env.id;
	},
	get CLOUDFLARE_STREAM_API_TOKEN() {
		return env.token;
	}
}));

import {
	CloudflareStreamRequestError,
	createDirectUploadUrl,
	createSignedPlaybackToken,
	createTusDirectUpload,
	deleteStreamVideo,
	getVideoDetails,
	listCloudflareVideos
} from './cloudflare-stream';

const reply = (status: number, body: unknown, headers: Record<string, string> = {}) =>
	new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers });

function stub(...responses: Response[]) {
	const fetchMock = vi.fn(async () => responses.shift() ?? reply(500, 'plus de réponse prévue'));
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

afterEach(() => {
	vi.unstubAllGlobals();
	env.id = 'acct';
	env.token = 'tok';
});

describe('configuration', () => {
	it('refuse de travailler sans identifiant de compte ou sans jeton', async () => {
		env.id = ' ';
		await expect(getVideoDetails('x')).rejects.toThrow('Configuration Stream incomplète');
		env.id = 'acct';
		env.token = '';
		await expect(deleteStreamVideo('x')).rejects.toThrow('Configuration Stream incomplète');
	});
});

describe('createDirectUploadUrl', () => {
	it('demande une URL d’envoi avec une durée bornée et des métadonnées en texte', async () => {
		const fetchMock = stub(reply(200, { success: true, result: { uploadURL: 'https://up.test/1', uid: 'u1' } }));
		const result = await createDirectUploadUrl({ maxDurationSeconds: 10, requireSignedURLs: false, meta: { n: 5 as unknown as string } });
		expect(result).toEqual({ uploadURL: 'https://up.test/1', uid: 'u1' });
		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('https://api.cloudflare.com/client/v4/accounts/acct/stream/direct_upload');
		expect(JSON.parse(String(init.body))).toEqual({ maxDurationSeconds: 60, requireSignedURLs: false, meta: { n: '5' } });
	});

	it('plafonne la durée et applique la valeur par défaut quand elle est absente ou invalide', async () => {
		for (const [asked, sent] of [[999_999, 21600], [undefined, 7200], [-5, 7200], [Number.NaN, 7200]] as const) {
			const fetchMock = stub(reply(200, { success: true, result: { uploadURL: 'u', uid: 'i' } }));
			await createDirectUploadUrl({ maxDurationSeconds: asked });
			expect(JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body)).maxDurationSeconds).toBe(sent);
		}
	});

	it('signale un quota dépassé (code 10011 ou HTTP 413) avec la conduite à tenir', async () => {
		stub(reply(400, { errors: [{ message: 'Quota', code: 10011 }] }));
		const error = (await createDirectUploadUrl().catch((e: unknown) => e)) as CloudflareStreamRequestError;
		expect(error).toBeInstanceOf(CloudflareStreamRequestError);
		expect(error.httpStatus).toBe(400);
		expect(error.message).toContain('Cloudflare (400) : Quota [code 10011]');
		expect(error.message).toContain('Quota Stream dépassé');

		stub(reply(413, { errors: [{ message: 'Trop gros' }] }));
		await expect(createDirectUploadUrl()).rejects.toThrow(/Cloudflare \(413\) : Trop gros\n\nQuota Stream dépassé/);
	});

	it('décrit une erreur sans message exploitable : corps texte, vide ou JSON sans erreur', async () => {
		stub(reply(500, 'panne'));
		await expect(createDirectUploadUrl()).rejects.toThrow('direct_upload a répondu 500 : panne');
		stub(reply(500, ''));
		await expect(createDirectUploadUrl()).rejects.toThrow('(corps vide)');
		stub(reply(500, { errors: [] }));
		await expect(createDirectUploadUrl()).rejects.toThrow('direct_upload a répondu 500');
	});

	it('refuse une réponse 200 qui n’est pas du JSON ou qui ne contient pas l’URL', async () => {
		stub(reply(200, 'pas du json'));
		await expect(createDirectUploadUrl()).rejects.toMatchObject({ httpStatus: 502, message: expect.stringContaining('JSON invalide') });
		stub(reply(200, { success: false, result: {} }));
		await expect(createDirectUploadUrl()).rejects.toMatchObject({ httpStatus: 502 });
		stub(reply(200, { success: true, result: { uid: 'sans-url' } }));
		await expect(createDirectUploadUrl()).rejects.toMatchObject({ httpStatus: 502 });
	});
});

describe('createTusDirectUpload', () => {
	it('renvoie l’URL tus et l’identifiant lus dans les en-têtes', async () => {
		const fetchMock = stub(reply(201, '', { location: 'https://tus.test/x', 'stream-media-id': 'u2' }));
		expect(await createTusDirectUpload(1_000_000, { name: 'Séance', requireSignedURLs: true })).toEqual({ uploadURL: 'https://tus.test/x', uid: 'u2' });
		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toContain('?direct_user=true');
		const headers = init.headers as Record<string, string>;
		expect(headers['Upload-Length']).toBe('1000000');
		expect(headers['Upload-Metadata']).toContain('requiresignedurls');
		expect(headers['Upload-Metadata']).toContain(`name ${Buffer.from('Séance').toString('base64')}`);
	});

	it('échoue quand les en-têtes manquent, avec le statut reçu ou 502 si la réponse est « ok »', async () => {
		stub(reply(403, { errors: [{ message: 'Refusé' }] }));
		await expect(createTusDirectUpload(10)).rejects.toMatchObject({ httpStatus: 403 });
		stub(reply(201, '', {}));
		await expect(createTusDirectUpload(10, { requireSignedURLs: false })).rejects.toMatchObject({ httpStatus: 502 });
	});
});

describe('getVideoDetails et deleteStreamVideo', () => {
	it('lit les métadonnées ; 404 donne null ; une autre erreur est remontée', async () => {
		stub(reply(200, { result: { uid: 'v', status: { state: 'ready' }, duration: 90, thumbnail: 't', readyToStream: true } }));
		expect(await getVideoDetails('v')).toEqual({ uid: 'v', status: 'ready', duration: 90, thumbnail: 't', readyToStream: true });
		stub(reply(200, { result: { uid: 'v', duration: -1 } }));
		expect(await getVideoDetails('v')).toEqual({ uid: 'v', status: 'pendingupload', duration: null, thumbnail: null, readyToStream: false });
		stub(reply(404, ''));
		expect(await getVideoDetails('v')).toBeNull();
		stub(reply(500, 'oups'));
		await expect(getVideoDetails('v')).rejects.toThrow('get error 500: oups');
	});

	it('supprime de façon idempotente : 404 ignoré, autre erreur remontée', async () => {
		stub(reply(200, {}));
		await expect(deleteStreamVideo('v')).resolves.toBeUndefined();
		stub(reply(404, ''));
		await expect(deleteStreamVideo('v')).resolves.toBeUndefined();
		stub(reply(500, 'oups'));
		await expect(deleteStreamVideo('v')).rejects.toThrow('delete error 500: oups');
	});
});

describe('createSignedPlaybackToken', () => {
	it('demande un jeton qui expire et n’autorise pas le téléchargement pour un utilisateur', async () => {
		const fetchMock = stub(reply(200, { result: { token: 'jeton' } }));
		expect(await createSignedPlaybackToken('v', { expiresInSeconds: 60, userId: 'u' })).toBe('jeton');
		const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body)) as { exp: number; downloadable?: boolean };
		expect(body.downloadable).toBe(false);
		expect(body.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
	});

	it('remonte l’échec de l’API', async () => {
		stub(reply(401, 'non autorisé'));
		await expect(createSignedPlaybackToken('v')).rejects.toThrow('token error 401: non autorisé');
	});
});

describe('listCloudflareVideos', () => {
	it('remonte l’échec de l’API', async () => {
		stub(reply(500, 'oups'));
		await expect(listCloudflareVideos()).rejects.toThrow('list error 500: oups');
	});
});
