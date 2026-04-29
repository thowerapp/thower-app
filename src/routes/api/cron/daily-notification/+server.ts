import { prisma } from '$lib/server';
import { sendWebPush } from '$server/web-push';
import type { RequestHandler } from './$types';

/** Rappel quotidien à 20h40 Paris (19h40 UTC, appelé par Vercel Cron). Test : GET /api/cron/daily-notification */
export const GET: RequestHandler = async () => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const subs = await (prisma as any).pushSubscription.findMany({
		select: { endpoint: true, p256dh: true, auth: true, userId: true }
	});

	const usersWithPhotos = await prisma.progressPhoto.findMany({
		where: { month: 0 },
		select: { userId: true },
		distinct: ['userId']
	});
	const userIdsWithPhotos = new Set(usersWithPhotos.map((p) => p.userId));

	let sent = 0;
	let failed = 0;
	for (const sub of subs) {
		const hasPhotos = userIdsWithPhotos.has(sub.userId);
		const payload = hasPhotos
			? { title: 'Thower', body: "C'est l'heure de votre rappel quotidien — pensez à votre accompagnement.", url: '/user' }
			: { title: '📸 Photos!', body: 'Envoie tes photos pour +50 points.', url: '/auth/photos' };
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
			total,			usersWithPhotos: userIdsWithPhotos.size,			...(total === 0 && {
				message: 'Aucun abonnement push. Sur ton téléphone : ouvre l’app en prod, connecte-toi, Paramètres → Notification de test.'
			})
		}),
		{ headers: { 'Content-Type': 'application/json' } }
	);
};
