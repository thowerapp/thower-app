import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDiscoveryContentByCategory } from '$lib/prisma/discoveryContent/getByCategory';
import { getCompletedDiscoveryContentIds } from '$lib/prisma/userVideoProgress/getCompletedIds';
import { prisma } from '$lib/server';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/auth/login');
	const userId = locals.user.id;

	const [meditation, mindset, breathwork, motivation, completedIds, pointEvents] = await Promise.all([
		getDiscoveryContentByCategory('MEDITATION'),
		getDiscoveryContentByCategory('MINDSET'),
		getDiscoveryContentByCategory('BREATHWORK'),
		getDiscoveryContentByCategory('MOTIVATION'),
		getCompletedDiscoveryContentIds(userId),
		prisma.pointEvent.findMany({ where: { userId }, select: { amount: true } })
	]);

	const totalPoints = pointEvents.reduce((s, e) => s + e.amount, 0);
	const completedSet = new Set(completedIds);

	function countUnlocked(videos: unknown[]) {
		return (videos as Array<{ unlockThreshold: number }>)
			.filter((v) => totalPoints >= v.unlockThreshold).length;
	}

	return {
		counts: {
			meditation: { unlocked: countUnlocked(meditation), total: meditation.length },
			mindset:    { unlocked: countUnlocked(mindset),    total: mindset.length    },
			breathwork: { unlocked: countUnlocked(breathwork), total: breathwork.length },
			motivation: { unlocked: countUnlocked(motivation), total: motivation.length }
		}
	};
};
