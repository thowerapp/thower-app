import { prisma } from '$lib/server';
import { sendWebPush } from '$server/web-push';
import { todayStartParis } from '$lib/utils/programDay';
import type { RequestHandler } from './$types';

/**
 * Rappel à 10h et 19h Paris (appelé par Vercel Cron) pour les utilisateurs qui n'ont pas
 * ouvert l'app depuis minuit Paris. Test : GET /api/cron/daily-notification?secret=CRON_SECRET
 */
export const GET: RequestHandler = async ({ request, url }) => {
	const secret = process.env.CRON_SECRET;
	const provided =
		request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? url.searchParams.get('secret');
	if (!secret || provided !== secret) {
		return new Response(JSON.stringify({ ok: false, error: 'Non autorisé' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const todayStart = todayStartParis();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const subs = await (prisma as any).pushSubscription.findMany({
		where: {
			user: { OR: [{ lastSeenAt: null }, { lastSeenAt: { isSet: false } }, { lastSeenAt: { lt: todayStart } }] }
		},
		select: { id: true, endpoint: true, p256dh: true, auth: true }
	});

	const payload = {
		title: 'Thower',
		body: "Tu ne t'es pas encore connecté aujourd'hui : ta journée t'attend 💪",
		url: '/user'
	};

	let sent = 0;
	let failed = 0;
	const expiredIds: string[] = [];
	for (const sub of subs) {
		const result = await sendWebPush({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
		if (result.ok) sent++;
		else {
			failed++;
			// 404/410 : abonnement révoqué ou expiré côté navigateur
			if (result.statusCode === 404 || result.statusCode === 410) expiredIds.push(sub.id);
			console.warn('[cron daily-notification] push failed:', result.error);
		}
	}
	if (expiredIds.length > 0) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		await (prisma as any).pushSubscription.deleteMany({ where: { id: { in: expiredIds } } });
	}
	const total = subs.length;
	return new Response(
		JSON.stringify({
			ok: true,
			sent,
			failed,
			total,
			removed: expiredIds.length,
			...(total === 0 && {
				message: 'Aucun abonnement push à relancer (tout le monde est venu aujourd’hui, ou personne n’est abonné).'
			})
		}),
		{ headers: { 'Content-Type': 'application/json' } }
	);
};
