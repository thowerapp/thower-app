import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

const tx = {
	userWorkoutDay: { updateMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
	pointEvent: { create: vi.fn() }
};
const prismaMock = {
	$transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
	userWorkoutDay: { findFirst: vi.fn() }
};

vi.mock('$lib/server', () => ({ prisma: prismaMock }));

const { completeWorkoutDay, isPrerequisiteMet, sessionCompletionPoints, WORKOUT_COMPLETION_POINTS } = await import(
	'./workoutCompletion'
);

const base = {
	userId: 'u1',
	sessionId: 's1',
	sessionName: 'S',
	sessionType: 'MAIN_A' as const,
	dayIndex: 3,
	contentDayIndex: 3
};

beforeEach(() => {
	vi.clearAllMocks();
	prismaMock.$transaction.mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx));
});

describe('completeWorkoutDay', () => {
	it('valide une ligne existante non valid\u00e9e et cr\u00e9dite les points une fois', async () => {
		tx.userWorkoutDay.updateMany.mockResolvedValue({ count: 1 });
		await expect(completeWorkoutDay(base)).resolves.toBe(true);
		expect(tx.userWorkoutDay.create).not.toHaveBeenCalled();
		expect(tx.pointEvent.create).toHaveBeenCalledTimes(1);
		expect(tx.pointEvent.create.mock.calls[0][0].data.amount).toBe(WORKOUT_COMPLETION_POINTS);
	});

	it('cr\u00e9e la ligne si elle n\u2019existe pas', async () => {
		tx.userWorkoutDay.updateMany.mockResolvedValue({ count: 0 });
		tx.userWorkoutDay.findUnique.mockResolvedValue(null);
		await expect(completeWorkoutDay(base)).resolves.toBe(true);
		expect(tx.userWorkoutDay.create).toHaveBeenCalledTimes(1);
		expect(tx.pointEvent.create).toHaveBeenCalledTimes(1);
	});

	it('ne cr\u00e9dite rien si la s\u00e9ance est d\u00e9j\u00e0 valid\u00e9e', async () => {
		tx.userWorkoutDay.updateMany.mockResolvedValue({ count: 0 });
		tx.userWorkoutDay.findUnique.mockResolvedValue({ id: 'x' });
		await expect(completeWorkoutDay(base)).resolves.toBe(false);
		expect(tx.pointEvent.create).not.toHaveBeenCalled();
	});

	it.each(['P2002', 'P2034'])('traite %s comme une validation concurrente', async (code) => {
		prismaMock.$transaction.mockRejectedValue(
			new Prisma.PrismaClientKnownRequestError('conflit', { code, clientVersion: 'test' })
		);
		await expect(completeWorkoutDay(base)).resolves.toBe(false);
	});

	it('valide une séance Découverte sans créditer de points', async () => {
		tx.userWorkoutDay.updateMany.mockResolvedValue({ count: 1 });
		await expect(completeWorkoutDay({ ...base, sessionType: 'DISCOVERY' })).resolves.toBe(true);
		expect(tx.pointEvent.create).not.toHaveBeenCalled();
	});

	it('propage les autres erreurs', async () => {
		prismaMock.$transaction.mockRejectedValue(new Error('db down'));
		await expect(completeWorkoutDay(base)).rejects.toThrow('db down');
	});
});

describe('sessionCompletionPoints', () => {
	it('crédite les séances principales, pas la Découverte', () => {
		expect(sessionCompletionPoints('MAIN_A')).toBe(WORKOUT_COMPLETION_POINTS);
		expect(sessionCompletionPoints('MAIN_C')).toBe(WORKOUT_COMPLETION_POINTS);
		expect(sessionCompletionPoints('DISCOVERY')).toBe(0);
	});
});

describe('isPrerequisiteMet', () => {
	const start = new Date('2026-01-05T00:00:00.000Z');

	it('ne demande rien pour la s\u00e9ance 1', async () => {
		await expect(
			isPrerequisiteMet({ userId: 'u1', sessionType: 'MAIN_A', dayIndex: 9, programStart: start })
		).resolves.toBe(true);
		expect(prismaMock.userWorkoutDay.findFirst).not.toHaveBeenCalled();
	});

	it('cherche la s\u00e9ance pr\u00e9c\u00e9dente dans la semaine du jour', async () => {
		prismaMock.userWorkoutDay.findFirst.mockResolvedValue(null);
		await expect(
			isPrerequisiteMet({ userId: 'u1', sessionType: 'MAIN_B', dayIndex: 9, programStart: start })
		).resolves.toBe(false);
		const where = prismaMock.userWorkoutDay.findFirst.mock.calls[0][0].where;
		expect(where.dayIndex).toEqual({ gte: 8, lte: 14 });
		expect(where.session).toEqual({ type: 'MAIN_A' });
	});

	it('autorise quand la s\u00e9ance pr\u00e9c\u00e9dente est valid\u00e9e', async () => {
		prismaMock.userWorkoutDay.findFirst.mockResolvedValue({ id: 'x' });
		await expect(
			isPrerequisiteMet({ userId: 'u1', sessionType: 'MAIN_C', dayIndex: 5, programStart: start })
		).resolves.toBe(true);
	});
});
