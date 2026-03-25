import { prisma } from '$lib/server';

export async function getSessionWithVideos(sessionId: string) {
	const client = prisma as {
		workoutSession?: {
			findUnique: (args: {
				where: { id: string };
				include: { videos: { orderBy: { order: 'asc' } } };
			}) => Promise<unknown>;
		};
	};
	if (!client?.workoutSession) return null;
	return client.workoutSession.findUnique({
		where: { id: sessionId },
		include: { videos: { orderBy: { order: 'asc' } } }
	});
}
