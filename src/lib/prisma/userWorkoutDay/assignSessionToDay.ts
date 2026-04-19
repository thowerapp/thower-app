import { prisma } from '$lib/server';

export type AssignSessionToDayData = {
	userId: string;
	sessionId: string;
	dayIndex: number;
	scheduledDate?: Date | null;
};

/** Upsert une assignation jour ↔ séance (unicité Mongo : userId + sessionId + dayIndex). */
export async function assignSessionToDay(data: AssignSessionToDayData) {
	return prisma.userWorkoutDay.upsert({
		where: {
			userId_sessionId_dayIndex: {
				userId: data.userId,
				sessionId: data.sessionId,
				dayIndex: data.dayIndex
			}
		},
		create: {
			userId: data.userId,
			sessionId: data.sessionId,
			dayIndex: data.dayIndex,
			scheduledDate: data.scheduledDate ?? undefined
		},
		update: {
			scheduledDate: data.scheduledDate ?? undefined
		}
	});
}
