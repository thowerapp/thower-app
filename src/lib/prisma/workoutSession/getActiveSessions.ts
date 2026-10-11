import { prisma } from '$lib/server';

export async function getActiveSessions() {
	return prisma.workoutSession.findMany({
		where: { active: true },
		orderBy: { order: 'asc' }
	});
}
