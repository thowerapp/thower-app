import { prisma } from '$lib/server';

export async function getActiveChallenges(now = new Date()) {
	const client = prisma as {
		adminChallenge?: {
			findMany: (args: {
				where: { active: true; endAt: { gte: Date } };
				orderBy: { startAt: 'asc' };
			}) => Promise<unknown[]>;
		};
	};
	if (!client?.adminChallenge) return [];
	return client.adminChallenge.findMany({
		where: { active: true, endAt: { gte: now } },
		orderBy: { startAt: 'asc' }
	});
}
