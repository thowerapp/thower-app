import { describe, expect, it } from 'vitest';
import { prisma } from '$lib/server';
import { createDailyTask, createPaidUser } from '$lib/server/testing/integration/db';
import { validateDailyChecklist } from './dailyChecklist';

describe('validateDailyChecklist (base réelle)', () => {
	it('double envoi simultané : une validation, un 409, des points une seule fois', async () => {
		const user = await createPaidUser();
		const [t1, t2] = await Promise.all([createDailyTask({ points: 10 }), createDailyTask({ points: 15 })]);
		const ids = [t1.id, t2.id];

		const results = await Promise.all([
			validateDailyChecklist(user.id, ids, 'test'),
			validateDailyChecklist(user.id, ids, 'test')
		]);

		expect(results.filter((r) => r.ok)).toHaveLength(1);
		expect(results.find((r) => !r.ok)).toMatchObject({ ok: false, status: 409 });
		expect(await prisma.dailyTaskCompletion.count({ where: { userId: user.id } })).toBe(2);
		const points = await prisma.pointEvent.findMany({ where: { userId: user.id } });
		expect(points).toHaveLength(1);
		expect(points[0].amount).toBe(25);
	});

	it('ignore les tâches de repli (__…)', async () => {
		const user = await createPaidUser();
		const result = await validateDailyChecklist(user.id, ['__fallback'], 'test');
		expect(result).toMatchObject({ ok: false, status: 400 });
	});
});
