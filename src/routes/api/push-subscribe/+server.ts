import { prisma } from '$lib/server';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	if (event.locals.user == null) {
		return new Response(JSON.stringify({ error: 'Non authentifié' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}
	let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
	try {
		body = await event.request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'Body JSON invalide' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}
	const endpoint = body.endpoint;
	const p256dh = body.keys?.p256dh;
	const auth = body.keys?.auth;
	if (!endpoint || !p256dh || !auth) {
		return new Response(
			JSON.stringify({ error: 'Champs requis : endpoint, keys.p256dh, keys.auth' }),
			{ status: 400, headers: { 'Content-Type': 'application/json' } }
		);
	}
	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		await (prisma as any).pushSubscription.upsert({
			where: {
				userId_endpoint: { userId: event.locals.user.id, endpoint }
			},
			create: {
				userId: event.locals.user.id,
				endpoint,
				p256dh,
				auth
			},
			update: { p256dh, auth }
		});
		return new Response(JSON.stringify({ ok: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (e) {
		console.error('[push-subscribe]', e);
		return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
