import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { prisma } from '$lib/server';
import { isAuthorizedCron } from '$lib/server/cronAuth';
import { sendWebPush } from '$server/web-push';
import type { RequestHandler } from './$types';

/** Rappel quotidien à 10h et 19h Paris (appelé par Vercel Cron). Authentifié par CRON_SECRET (libre en dev) : GET /api/cron/daily-notification */
export const GET: RequestHandler = async ({ request }) => {
	if (!isAuthorizedCron(request.headers.get('authorization'), env.CRON_SECRET, dev)) {
		return new Response('Unauthorized', { status: 401 });
	}

	const subs = await prisma.pushSubscription.findMany({
		select: { endpoint: true, p256dh: true, auth: true }
	});

	const payload = {
		title: 'Thower',
		body: 'Il est temps de vous connecter et de suivre votre programme',
		url: '/user'
	};

	let sent = 0;
	let failed = 0;
	for (const sub of subs) {
		const result = await sendWebPush({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
		if (result.ok) sent++;
		else {
			failed++;
			console.warn('[cron daily-notification] push failed:', result.error);
		}
	}
	const total = subs.length;
	return new Response(
		JSON.stringify({
			ok: true,
			sent,
			failed,
			total,
			...(total === 0 && {
				message: 'Aucun abonnement push. Sur ton téléphone : ouvre l’app en prod, connecte-toi, Paramètres → Notification de test.'
			})
		}),
		{ headers: { 'Content-Type': 'application/json' } }
	);
};
