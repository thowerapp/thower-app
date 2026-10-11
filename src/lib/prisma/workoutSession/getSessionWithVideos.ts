import { prisma } from '$lib/server';

export async function getSessionWithVideos(sessionId: string) {
	return prisma.workoutSession.findUnique({ where: { id: sessionId } });
}
