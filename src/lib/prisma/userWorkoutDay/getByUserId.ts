import { prisma } from '$lib/server';

export async function getWorkoutDaysByUserId(userId: string) {
	return prisma.userWorkoutDay.findMany({
		where: { userId },
		include: { session: true },
		orderBy: { dayIndex: 'asc' }
	});
}
