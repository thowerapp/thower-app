/**
 * Faux services externes des tests e2e : Google (échange du code OAuth), Stripe (sessions de paiement)
 * et Cloudflare Stream (vidéos). L'application y est redirigée par e2e/support/externalsPreload.mjs ;
 * les tests pilotent son contenu par les routes `/__control/*` (voir e2e/support/fakes.ts).
 */
import http from 'node:http';
import net from 'node:net';

type GoogleIdentity = { sub: string; email: string; name: string; picture: string };
type StripeSession = Record<string, unknown> & { id: string };
type StreamVideo = {
	uid: string;
	meta?: { name?: string };
	status?: { state?: string };
	duration?: number;
	thumbnail?: string;
	created?: string;
	readyToStream?: boolean;
};

const state = {
	googleIdentities: new Map<string, GoogleIdentity>(),
	stripeSessions: new Map<string, StripeSession>(),
	stripeAutoPay: false,
	stripeCounter: 0,
	streamVideos: new Map<string, StreamVideo>(),
	streamCounter: 0,
	streamRequests: [] as { method: string; path: string; body: unknown }[],
	smtpUp: false,
	smtpMessages: [] as { to: string[]; data: string }[]
};

function reset() {
	state.googleIdentities.clear();
	state.stripeSessions.clear();
	state.stripeAutoPay = false;
	state.streamVideos.clear();
	state.streamRequests.length = 0;
	state.smtpUp = false;
	state.smtpMessages.length = 0;
}

async function readBody(req: http.IncomingMessage): Promise<string> {
	const chunks: Buffer[] = [];
	for await (const chunk of req) chunks.push(chunk as Buffer);
	return Buffer.concat(chunks).toString('utf8');
}

function send(
	res: http.ServerResponse,
	status: number,
	body: unknown,
	headers: Record<string, string> = {}
) {
	res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
	res.end(JSON.stringify(body));
}

const b64url = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

/** Le SDK Stripe encode les objets imbriqués en `a[b][c]=v`. */
function decodeStripeForm(raw: string): Record<string, string> {
	return Object.fromEntries(new URLSearchParams(raw));
}

function createStripeSession(form: Record<string, string>): StripeSession {
	const id = `cs_test_fake_${++state.stripeCounter}_${Date.now().toString(36)}`;
	let amountTotal = 0;
	for (let i = 0; form[`line_items[${i}][price_data][unit_amount]`] !== undefined; i++) {
		amountTotal +=
			Number(form[`line_items[${i}][price_data][unit_amount]`]) *
			Number(form[`line_items[${i}][quantity]`] ?? 1);
	}
	const metadata: Record<string, string> = {};
	for (const [key, value] of Object.entries(form)) {
		const match = /^metadata\[(.+)\]$/.exec(key);
		if (match) metadata[match[1]] = value;
	}
	const paid = state.stripeAutoPay;
	const successUrl = (form.success_url ?? '').replace('{CHECKOUT_SESSION_ID}', id);
	const session: StripeSession = {
		id,
		object: 'checkout.session',
		mode: form.mode ?? 'payment',
		amount_total: amountTotal,
		currency: 'eur',
		client_reference_id: form.client_reference_id ?? null,
		customer_email: form.customer_email ?? null,
		customer_details: { email: form.customer_email ?? null, name: 'Testeur' },
		metadata,
		status: paid ? 'complete' : 'open',
		payment_status: paid ? 'paid' : 'unpaid',
		success_url: successUrl,
		cancel_url: form.cancel_url ?? null,
		// Avec le paiement automatique, le « checkout » renvoie directement à l'application.
		url: paid ? successUrl : `http://127.0.0.1:0/fake-checkout/${id}`,
		created: Math.floor(Date.now() / 1000)
	};
	state.stripeSessions.set(id, session);
	return session;
}

async function handle(req: http.IncomingMessage, res: http.ServerResponse) {
	const url = new URL(req.url ?? '/', 'http://fake');
	const path = url.pathname;
	const method = req.method ?? 'GET';
	const raw = method === 'GET' || method === 'DELETE' ? '' : await readBody(req);

	// ── Pilotage par les tests ────────────────────────────────────────────
	if (path === '/__control/reset') {
		reset();
		return send(res, 200, { ok: true });
	}
	if (path === '/__control/google/identity') {
		const { code, ...identity } = JSON.parse(raw) as GoogleIdentity & { code: string };
		state.googleIdentities.set(code, identity);
		return send(res, 200, { ok: true });
	}
	if (path === '/__control/stripe/auto-pay') {
		state.stripeAutoPay = (JSON.parse(raw) as { enabled: boolean }).enabled;
		return send(res, 200, { ok: true });
	}
	if (path === '/__control/stripe/session') {
		const session = JSON.parse(raw) as StripeSession;
		state.stripeSessions.set(session.id, {
			object: 'checkout.session',
			created: Math.floor(Date.now() / 1000),
			...session
		});
		return send(res, 200, { ok: true });
	}
	if (path === '/__control/stripe/sessions') {
		return send(res, 200, [...state.stripeSessions.values()]);
	}
	if (path === '/__control/cloudflare/videos') {
		state.streamVideos = new Map((JSON.parse(raw) as StreamVideo[]).map((v) => [v.uid, v]));
		return send(res, 200, { ok: true });
	}
	if (path === '/__control/smtp/up') {
		state.smtpUp = (JSON.parse(raw) as { enabled: boolean }).enabled;
		return send(res, 200, { ok: true });
	}
	if (path === '/__control/smtp/messages') {
		return send(res, 200, state.smtpMessages);
	}
	if (path === '/__control/cloudflare/requests') {
		return send(res, 200, state.streamRequests);
	}

	// ── Google ────────────────────────────────────────────────────────────
	if (path === '/google/token' && method === 'POST') {
		const code = new URLSearchParams(raw).get('code') ?? '';
		const identity = state.googleIdentities.get(code);
		if (!identity) return send(res, 400, { error: 'invalid_grant' });
		const idToken = `${b64url({ alg: 'none' })}.${b64url(identity)}.fake`;
		return send(res, 200, {
			access_token: 'fake-access-token',
			token_type: 'Bearer',
			expires_in: 3600,
			id_token: idToken
		});
	}

	// ── Stripe ────────────────────────────────────────────────────────────
	if (path === '/stripe/v1/checkout/sessions' && method === 'POST') {
		return send(res, 200, createStripeSession(decodeStripeForm(raw)));
	}
	if (path === '/stripe/v1/checkout/sessions' && method === 'GET') {
		const wantedStatus = url.searchParams.get('status');
		const createdGte = Number(url.searchParams.get('created[gte]') ?? 0);
		const data = [...state.stripeSessions.values()].filter(
			(s) => (!wantedStatus || s.status === wantedStatus) && Number(s.created ?? 0) >= createdGte
		);
		return send(res, 200, { object: 'list', data, has_more: false, url: '/v1/checkout/sessions' });
	}
	const stripeOne = /^\/stripe\/v1\/checkout\/sessions\/([^/]+)$/.exec(path);
	if (stripeOne && method === 'GET') {
		const session = state.stripeSessions.get(stripeOne[1]);
		if (!session)
			return send(res, 404, {
				error: { type: 'invalid_request_error', message: 'No such checkout.session' }
			});
		return send(res, 200, session);
	}

	// ── Cloudflare Stream ─────────────────────────────────────────────────
	const stream =
		/^\/cloudflare\/client\/v4\/accounts\/[^/]+\/stream(?:\/([^/]+))?(?:\/(token))?$/.exec(path);
	if (stream) {
		const [, segment, sub] = stream;
		let body: unknown = undefined;
		try {
			body = raw ? JSON.parse(raw) : undefined;
		} catch {
			body = raw;
		}
		state.streamRequests.push({ method, path: `${path}${url.search}`, body });

		if (segment === 'direct_upload' && method === 'POST') {
			const uid = `fake-stream-${++state.streamCounter}`;
			return send(res, 200, {
				success: true,
				result: { uploadURL: `https://upload.fake.test/${uid}`, uid }
			});
		}
		if (!segment && method === 'POST' && url.searchParams.get('direct_user') === 'true') {
			const uid = `fake-tus-${++state.streamCounter}`;
			res.writeHead(201, {
				Location: `https://upload.fake.test/tus/${uid}`,
				'Stream-Media-Id': uid
			});
			return res.end();
		}
		if (!segment && method === 'GET') {
			return send(res, 200, { success: true, result: [...state.streamVideos.values()] });
		}
		if (segment && sub === 'token' && method === 'POST') {
			return send(res, 200, { success: true, result: { token: `signed-${segment}` } });
		}
		if (segment && !sub && method === 'GET') {
			const video = state.streamVideos.get(segment);
			return video
				? send(res, 200, { success: true, result: video })
				: send(res, 404, { success: false });
		}
		if (segment && !sub && method === 'DELETE') {
			state.streamVideos.delete(segment);
			return send(res, 200, { success: true, result: {} });
		}
	}

	return send(res, 404, { error: `Faux service : route inconnue ${method} ${path}` });
}

/** Serveur SMTP minimal : refuse la connexion (421) tant qu'il est « éteint », sinon accepte et mémorise chaque message. */
export function startFakeSmtp(port: number): Promise<net.Server> {
	const server = net.createServer((socket) => {
		if (!state.smtpUp) {
			socket.end('421 4.3.2 Service not available\r\n');
			return;
		}
		socket.write('220 fake.smtp ESMTP\r\n');
		let buffer = '';
		let data: string | null = null;
		let to: string[] = [];
		let auth: 'plain' | 'user' | 'pass' | null = null;
		socket.on('data', (chunk) => {
			buffer += chunk.toString('utf8');
			for (;;) {
				if (data !== null) {
					const end = buffer.indexOf('\r\n.\r\n');
					if (end === -1) return;
					state.smtpMessages.push({ to, data: buffer.slice(0, end) });
					buffer = buffer.slice(end + 5);
					data = null;
					to = [];
					socket.write('250 queued\r\n');
					continue;
				}
				const eol = buffer.indexOf('\r\n');
				if (eol === -1) return;
				const line = buffer.slice(0, eol);
				buffer = buffer.slice(eol + 2);
				const command = line.toUpperCase();
				if (auth) {
					if (auth === 'user') {
						auth = 'pass';
						socket.write('334 UGFzc3dvcmQ6\r\n');
					} else {
						auth = null;
						socket.write('235 ok\r\n');
					}
				} else if (command.startsWith('EHLO') || command.startsWith('HELO')) {
					socket.write('250-fake.smtp\r\n250-AUTH PLAIN LOGIN\r\n250 8BITMIME\r\n');
				} else if (command.startsWith('AUTH PLAIN')) {
					if (line.trim().length > 'AUTH PLAIN'.length) socket.write('235 ok\r\n');
					else {
						auth = 'plain';
						socket.write('334 \r\n');
					}
				} else if (command.startsWith('AUTH LOGIN')) {
					auth = 'user';
					socket.write('334 VXNlcm5hbWU6\r\n');
				} else if (command.startsWith('RCPT TO')) {
					to.push(/<([^>]*)>/.exec(line)?.[1] ?? '');
					socket.write('250 ok\r\n');
				} else if (command === 'DATA') {
					data = '';
					socket.write('354 go ahead\r\n');
				} else if (command === 'QUIT') {
					socket.end('221 bye\r\n');
				} else {
					socket.write('250 ok\r\n');
				}
			}
		});
		socket.on('error', () => undefined);
	});
	return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

export function startFakeExternals(port: number): Promise<http.Server> {
	const server = http.createServer((req, res) => {
		handle(req, res).catch((err) => send(res, 500, { error: String(err) }));
	});
	return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}
