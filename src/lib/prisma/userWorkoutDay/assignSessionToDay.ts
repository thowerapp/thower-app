import { prisma } from '$lib/server';

export type AssignSessionToDayData = {
	userId: string;
	sessionId: string;
	dayIndex: number;
	scheduledDate?: Date | null;
};

export async function assignSessionToDay(data: AssignSessionToDayData) {
	const client = prisma as {
		userWorkoutDay?: {
			upsert: (args: {
				where: { userId_sessionId: { userId: string; sessionId: string } };
				create: unknown;
				update: unknown;
			}) => Promise<unknown>;
		};
	};
	if (!client?.userWorkoutDay) {
		throw new Error('Prisma client has no "userWorkoutDay" model. Run: npx prisma generate');
	}
	return client.userWorkoutDay.upsert({
		where: { userId_sessionId: { userId: data.userId, sessionId: data.sessionId } },
		create: {
			userId: data.userId,
			sessionId: data.sessionId,
			dayIndex: data.dayIndex,
			scheduledDate: data.scheduledDate ?? undefined
		},
		update: {
			dayIndex: data.dayIndex,
			scheduledDate: data.scheduledDate ?? undefined
		}
	});
}
