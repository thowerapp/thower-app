import { Prisma } from '@prisma/client';
import type { WorkoutSessionType } from '@prisma/client';
import { prisma } from '$lib/server';
import { POINTS } from '$lib/server/pointsConfig';
import { sportWeekBounds, sportWeekNumberForDay } from '$lib/utils/programDay';

/** Points gagnés à la validation d'une séance sport (source unique). */
export const WORKOUT_COMPLETION_POINTS = POINTS.WORKOUT_COMPLETE;

const PREVIOUS_TYPE: Partial<Record<WorkoutSessionType, WorkoutSessionType>> = {
	MAIN_B: 'MAIN_A',
	MAIN_C: 'MAIN_B'
};

/** Séance 2 exige la 1, séance 3 exige la 2, validée la même semaine sport. */
export async function isPrerequisiteMet(params: {
	userId: string;
	sessionType: WorkoutSessionType;
	dayIndex: number;
	programStart: Date | null;
}): Promise<boolean> {
	const previous = PREVIOUS_TYPE[params.sessionType];
	if (!previous) return true;

	const week = sportWeekNumberForDay(params.programStart, params.dayIndex);
	const { weekStart, weekEnd } = sportWeekBounds(params.programStart, week);
	const done = await prisma.userWorkoutDay.findFirst({
		where: {
			userId: params.userId,
			completedAt: { not: null },
			dayIndex: { gte: weekStart, lte: weekEnd },
			session: { type: previous }
		},
		select: { id: true }
	});
	return done !== null;
}

/** P2002 : clé unique, P2034 : conflit d'écriture. Dans les deux cas une autre requête a validé en premier. */
function isConcurrentCompletion(err: unknown): boolean {
	return (
		err instanceof Prisma.PrismaClientKnownRequestError &&
		(err.code === 'P2002' || err.code === 'P2034')
	);
}

/**
 * Valide la séance et crédite les points de façon atomique.
 * Retourne false si elle était déjà validée (y compris par une requête concurrente) : aucun point n'est alors ajouté.
 */
export async function completeWorkoutDay(params: {
	userId: string;
	sessionId: string;
	sessionName: string;
	dayIndex: number;
	contentDayIndex: number;
	scheduledDate?: Date;
}): Promise<boolean> {
	const { userId, sessionId, sessionName, dayIndex, contentDayIndex, scheduledDate } = params;

	try {
		return await prisma.$transaction(async (tx) => {
			const completion = {
				contentDayIndex,
				completedAt: new Date(),
				scheduledDate,
				isLocked: true
			};

			// Prisma/Mongo : `null` ne matche pas un champ absent, d'où `isSet: false`.
			const claimed = await tx.userWorkoutDay.updateMany({
				where: {
					userId,
					sessionId,
					dayIndex,
					OR: [{ completedAt: null }, { completedAt: { isSet: false } }]
				},
				data: completion
			});

			if (claimed.count === 0) {
				const existing = await tx.userWorkoutDay.findUnique({
					where: { userId_sessionId_dayIndex: { userId, sessionId, dayIndex } },
					select: { id: true }
				});
				if (existing) return false;
				await tx.userWorkoutDay.create({ data: { userId, sessionId, dayIndex, ...completion } });
			}

			await tx.pointEvent.create({
				data: {
					userId,
					type: 'WORKOUT_COMPLETE',
					amount: WORKOUT_COMPLETION_POINTS,
					metadata: { sessionId, sessionName, dayIndex }
				}
			});
			return true;
		});
	} catch (err) {
		if (isConcurrentCompletion(err)) return false;
		throw err;
	}
}
