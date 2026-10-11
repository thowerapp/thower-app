import { describe, expect, it } from 'vitest';
import { prisma } from '$lib/server';
import { createPaidUser, createWorkoutSession } from '$lib/server/testing/integration/db';
import { completeWorkoutDay, isPrerequisiteMet } from './workoutCompletion';

const START = new Date('2026-01-04T23:00:00.000Z');

describe('completeWorkoutDay (base réelle)', () => {
	it('double clic simultané : une seule validation et un seul PointEvent', async () => {
		const user = await createPaidUser({ programStartDate: START });
		const session = await createWorkoutSession('MAIN_A');
		const params = {
			userId: user.id,
			sessionId: session.id,
			sessionName: session.name,
			sessionType: session.type,
			dayIndex: 3,
			contentDayIndex: 3
		};

		const results = await Promise.all([completeWorkoutDay(params), completeWorkoutDay(params)]);

		expect(results.filter(Boolean)).toHaveLength(1);
		expect(await prisma.userWorkoutDay.count({ where: { userId: user.id } })).toBe(1);
		expect(await prisma.pointEvent.count({ where: { userId: user.id, type: 'WORKOUT_COMPLETE' } })).toBe(1);
	});

	it('valide une ligne existante dont completedAt est absent (déplacement préalable)', async () => {
		const user = await createPaidUser({ programStartDate: START });
		const session = await createWorkoutSession('MAIN_A');
		// Ligne créée par un déplacement : completedAt jamais écrit (champ absent en base).
		await prisma.$runCommandRaw({
			insert: 'user_workout_days',
			documents: [
				{ userId: { $oid: user.id }, sessionId: { $oid: session.id }, dayIndex: 5, contentDayIndex: 3, isLocked: false }
			]
		});

		const ok = await completeWorkoutDay({
			userId: user.id,
			sessionId: session.id,
			sessionName: session.name,
			sessionType: session.type,
			dayIndex: 5,
			contentDayIndex: 3
		});

		expect(ok).toBe(true);
		const row = await prisma.userWorkoutDay.findFirst({ where: { userId: user.id } });
		expect(row?.completedAt).not.toBeNull();
	});

	it('une séance Découverte se valide sans points', async () => {
		const user = await createPaidUser({ programStartDate: START });
		const session = await createWorkoutSession('DISCOVERY');
		await completeWorkoutDay({
			userId: user.id,
			sessionId: session.id,
			sessionName: session.name,
			sessionType: session.type,
			dayIndex: 4,
			contentDayIndex: 4
		});
		expect(await prisma.pointEvent.count({ where: { userId: user.id } })).toBe(0);
	});
});

describe('isPrerequisiteMet (base réelle)', () => {
	it('séance 2 bloquée tant que la séance 1 de la même semaine n’est pas validée, et par cycle', async () => {
		const user = await createPaidUser({ programStartDate: START });
		const a = await createWorkoutSession('MAIN_A');
		const base = { userId: user.id, sessionType: 'MAIN_B' as const, dayIndex: 3, programStart: START };

		expect(await isPrerequisiteMet(base)).toBe(false);

		await completeWorkoutDay({
			userId: user.id,
			sessionId: a.id,
			sessionName: a.name,
			sessionType: a.type,
			dayIndex: 1,
			contentDayIndex: 1
		});
		expect(await isPrerequisiteMet(base)).toBe(true);
		// Au cycle 2 (offset 91), la séance 1 validée au cycle 1 ne compte pas.
		expect(await isPrerequisiteMet({ ...base, offset: 91 })).toBe(false);
	});
});
