import { prisma } from '$lib/server';

export async function getActiveChallenges(now = new Date()) {
	return prisma.adminChallenge.findMany({
		where: { active: true, endAt: { gte: now } },
		orderBy: { startAt: 'asc' }
	});
}
