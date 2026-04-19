import { prisma } from '$lib/server';

/** Renvoie la liste des IDs de WorkoutVideo terminées (>= 90 %) par l'utilisateur. */
export async function getCompletedWorkoutVideoIds(userId: string): Promise<string[]> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const db = prisma as any;
	if (!db?.userVideoProgress) return [];
	const rows = await db.userVideoProgress.findMany({
		where: { userId, workoutVideoId: { not: null }, completedAt: { not: null } },
		select: { workoutVideoId: true }
	});
	return rows.map((r: { workoutVideoId: string }) => r.workoutVideoId);
}

/** Renvoie la liste des IDs de DiscoveryContent terminés (>= 90 %) par l'utilisateur. */
export async function getCompletedDiscoveryContentIds(userId: string): Promise<string[]> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const db = prisma as any;
	if (!db?.userVideoProgress) return [];
	const rows = await db.userVideoProgress.findMany({
		where: { userId, discoveryContentId: { not: null }, completedAt: { not: null } },
		select: { discoveryContentId: true }
	});
	return rows.map((r: { discoveryContentId: string }) => r.discoveryContentId);
}
