import { prisma } from '$lib/server';

/** Marque la ligne `UserWorkoutDay` pour ce triple (user, séance, jour programme) comme complétée. */
export async function setWorkoutDayCompleted(
	userId: string,
	sessionId: string,
	dayIndex: number,
	completedAt: Date = new Date()
) {
	return prisma.userWorkoutDay.updateMany({
		where: { userId, sessionId, dayIndex },
		data: { completedAt }
	});
}
