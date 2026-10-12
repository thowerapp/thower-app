import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('$env/static/private', () => ({
	CLOUDFLARE_ACCOUNT_ID: 'acct',
	CLOUDFLARE_R2_API_TOKEN: 'tok',
	R2_BUCKET_NAME: 'bucket'
}));

import { getFromR2, uploadToR2 } from './cloudflare-r2';

afterEach(() => vi.unstubAllGlobals());

describe('stockage R2', () => {
	it('envoie un objet avec le jeton et le type de contenu, clé encodée', async () => {
		const fetchMock = vi.fn(async () => new Response('', { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);
		await uploadToR2('photos/a b.jpg', new ArrayBuffer(2), 'image/jpeg');
		expect(fetchMock).toHaveBeenCalledWith(
			'https://api.cloudflare.com/client/v4/accounts/acct/r2/buckets/bucket/objects/photos%2Fa%20b.jpg',
			expect.objectContaining({
				method: 'PUT',
				headers: { Authorization: 'Bearer tok', 'Content-Type': 'image/jpeg' }
			})
		);
	});

	it('signale un échec d’envoi avec le détail renvoyé par le service', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => new Response('quota dépassé', { status: 403 })));
		await expect(uploadToR2('k', new ArrayBuffer(1), 'image/png')).rejects.toThrow('R2 upload error 403: quota dépassé');
	});

	it('relit un objet, ou signale son absence', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => new Response('octets', { status: 200 })));
		expect(await (await getFromR2('k')).text()).toBe('octets');
		vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
		await expect(getFromR2('k')).rejects.toThrow('R2 fetch error 404');
	});
});
