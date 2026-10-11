import { prisma } from '$lib/server';

/** Renvoie la liste des IDs de WorkoutVideo terminées (>= 90 %) par l'utilisateur. */
export async function getCompletedWorkoutVideoIds(userId: string): Promise<string[]> {
	const rows = await prisma.userVideoProgress.findMany({
		where: { userId, workoutVideoId: { not: null }, completedAt: { not: null } },
		select: { workoutVideoId: true }
	});
	return rows.flatMap((r) => (r.workoutVideoId ? [r.workoutVideoId] : []));
}

/** Renvoie la liste des IDs de DiscoveryContent terminés (>= 90 %) par l'utilisateur. */
export async function getCompletedDiscoveryContentIds(userId: string): Promise<string[]> {
	const rows = await prisma.userVideoProgress.findMany({
		where: { userId, discoveryContentId: { not: null }, completedAt: { not: null } },
		select: { discoveryContentId: true }
	});
	return rows.flatMap((r) => (r.discoveryContentId ? [r.discoveryContentId] : []));
}
