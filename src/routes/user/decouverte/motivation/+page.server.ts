import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDiscoveryContentByCategory } from '$lib/prisma/discoveryContent/getByCategory';
import { getCompletedDiscoveryContentIds } from '$lib/prisma/userVideoProgress/getCompletedIds';
import { prisma } from '$lib/server';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/auth/login');
	const userId = locals.user.id;

	const [rawVideos, completedIds, pointEvents] = await Promise.all([
		getDiscoveryContentByCategory('MOTIVATION'),
		getCompletedDiscoveryContentIds(userId),
		prisma.pointEvent.findMany({ where: { userId }, select: { amount: true } })
	]);

	const totalPoints = pointEvents.reduce((s, e) => s + e.amount, 0);
	const completedSet = new Set(completedIds);

	const videos = (rawVideos as Array<{
		id: string;
		title: string;
		order: number;
		unlockThreshold: number;
		thumbnailUrl: string | null;
		cloudflareUid: string;
	}>).map((v) => ({
		id: v.id,
		title: v.title,
		order: v.order,
		thumbnailUrl: v.thumbnailUrl ? encodeURI(v.thumbnailUrl) : null,
		isLocal: v.cloudflareUid.startsWith('local:'),
		unlockThreshold: v.unlockThreshold,
		unlocked: totalPoints >= v.unlockThreshold,
		completed: completedSet.has(v.id)
	}));

	const unlockedCount = videos.filter((v) => v.unlocked).length;

	return { videos, unlockedCount };
};
