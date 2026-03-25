import { prisma } from '$lib/server';

export async function getActiveRewards() {
	const client = prisma as { pointReward?: { findMany: (args: unknown) => Promise<unknown[]> } };
	if (!client?.pointReward) return [];
	return client.pointReward.findMany({
		where: { active: true },
		orderBy: { order: 'asc' }
	});
}
