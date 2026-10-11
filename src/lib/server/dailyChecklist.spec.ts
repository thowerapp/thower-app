import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

const prismaMock = vi.hoisted(() => ({
	dailyTask: { findMany: vi.fn() },
	dailyTaskCompletion: { count: vi.fn(), createMany: vi.fn((a: unknown) => a) },
	pointEvent: { create: vi.fn((a: unknown) => a) },
	$transaction: vi.fn(async (ops: unknown[]) => ops)
}));
vi.mock('$lib/server', () => ({ prisma: prismaMock }));

import { validateDailyChecklist } from './dailyChecklist';

beforeEach(() => {
	vi.clearAllMocks();
	prismaMock.dailyTask.findMany.mockResolvedValue([
		{ id: 't1', points: 5 },
		{ id: 't2', points: 10 }
	]);
	prismaMock.dailyTaskCompletion.count.mockResolvedValue(0);
	prismaMock.$transaction.mockImplementation(async (ops: unknown[]) => ops);
});

describe('validateDailyChecklist', () => {
	it('refuse une sélection vide ou ne contenant que des tâches de repli', async () => {
		expect(await validateDailyChecklist('u1', [], 'checklist')).toMatchObject({ ok: false, status: 400 });
		expect(await validateDailyChecklist('u1', ['__water', ''], 'checklist')).toMatchObject({
			ok: false,
			status: 400
		});
		expect(prismaMock.dailyTask.findMany).not.toHaveBeenCalled();
	});

	it('refuse quand aucune tâche STANDARD active ne correspond', async () => {
		prismaMock.dailyTask.findMany.mockResolvedValue([]);
		expect(await validateDailyChecklist('u1', ['x'], 'checklist')).toMatchObject({ ok: false, status: 400 });
	});

	it('refuse une checklist déjà validée aujourd’hui', async () => {
		prismaMock.dailyTaskCompletion.count.mockResolvedValue(1);
		expect(await validateDailyChecklist('u1', ['t1'], 'checklist')).toMatchObject({ ok: false, status: 409 });
		expect(prismaMock.$transaction).not.toHaveBeenCalled();
	});

	it('valide et crédite la somme des points avec la source indiquée', async () => {
		const result = await validateDailyChecklist('u1', ['t1', 't2'], 'journee-checklist');
		expect(result).toEqual({ ok: true, pointsEarned: 15 });
		const event = prismaMock.pointEvent.create.mock.calls[0][0] as {
			data: { amount: number; type: string; metadata: { source: string } };
		};
		expect(event.data.amount).toBe(15);
		expect(event.data.type).toBe('DAILY_TASK');
		expect(event.data.metadata.source).toBe('journee-checklist');
	});

	it('ne crée pas d’événement quand les tâches rapportent 0 point', async () => {
		prismaMock.dailyTask.findMany.mockResolvedValue([{ id: 't1', points: 0 }]);
		expect(await validateDailyChecklist('u1', ['t1'], 'checklist')).toEqual({ ok: true, pointsEarned: 0 });
		expect(prismaMock.pointEvent.create).not.toHaveBeenCalled();
	});

	it('traite un double envoi simultané comme déjà validé (409)', async () => {
		prismaMock.$transaction.mockRejectedValue(
			new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test' })
		);
		expect(await validateDailyChecklist('u1', ['t1'], 'checklist')).toMatchObject({ ok: false, status: 409 });
	});

	it('propage les autres erreurs', async () => {
		prismaMock.$transaction.mockRejectedValue(new Error('db'));
		await expect(validateDailyChecklist('u1', ['t1'], 'checklist')).rejects.toThrow('db');
	});
});
