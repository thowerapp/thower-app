import { prisma } from '$lib/server';

export async function setWorkoutDayCompleted(userId: string, sessionId: string, completedAt: Date = new Date()) {
	const client = prisma as {
		userWorkoutDay?: {
			updateMany: (args: {
				where: { userId: string; sessionId: string };
				data: { completedAt: Date };
			}) => Promise<unknown>;
		};
	};
	if (!client?.userWorkoutDay) {
		throw new Error('Prisma client has no "userWorkoutDay" model. Run: npx prisma generate');
	}
	return client.userWorkoutDay.updateMany({
		where: { userId, sessionId },
		data: { completedAt }
	});
}
