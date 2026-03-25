import { prisma } from '$lib/server';

export async function getWorkoutDaysByUserId(userId: string) {
	const client = prisma as {
		userWorkoutDay?: {
			findMany: (args: {
				where: { userId: string };
				include: { session: true };
				orderBy: { dayIndex: 'asc' };
			}) => Promise<unknown[]>;
		};
	};
	if (!client?.userWorkoutDay) return [];
	return client.userWorkoutDay.findMany({
		where: { userId },
		include: { session: true },
		orderBy: { dayIndex: 'asc' }
	});
}
