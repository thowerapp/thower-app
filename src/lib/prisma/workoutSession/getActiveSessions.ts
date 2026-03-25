import { prisma } from '$lib/server';

export async function getActiveSessions() {
	const client = prisma as {
		workoutSession?: {
			findMany: (args: { where: { active: true }; orderBy: { order: 'asc' } }) => Promise<unknown[]>;
		};
	};
	if (!client?.workoutSession) return [];
	return client.workoutSession.findMany({
		where: { active: true },
		orderBy: { order: 'asc' }
	});
}
