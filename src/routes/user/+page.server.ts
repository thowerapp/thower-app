import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server';
import type { PageServerLoad, Actions } from './$types';

function startOfUtcDay(d: Date = new Date()): Date {
	const r = new Date(d);
	r.setUTCHours(0, 0, 0, 0);
	return r;
}

const LEVELS = [
	{ min: 0,    num: 1, name: 'Bambou en herbe',    nextMin: 200  },
	{ min: 200,  num: 2, name: 'Bambou Furieux',     nextMin: 500  },
	{ min: 500,  num: 3, name: 'Guerrier en devenir', nextMin: 1000 },
	{ min: 1000, num: 4, name: 'Guerrier Thower',    nextMin: 2000 },
	{ min: 2000, num: 5, name: 'Maître Thower',      nextMin: null },
];

function computeLevel(points: number) {
	const levelData = LEVELS.slice().reverse().find(l => points >= l.min) ?? LEVELS[0];
	const levelPercent = levelData.nextMin != null
		? Math.round(((points - levelData.min) / (levelData.nextMin - levelData.min)) * 100)
		: 100;
	return { levelData, levelPercent };
}

export const load: PageServerLoad = async ({ locals, parent }) => {
	if (!locals.user) throw redirect(302, '/auth/login');
	const userId = locals.user.id;

	const parentData = await parent();
	type PA = { nutrition: boolean; sport: boolean };
	const programAccess: PA =
		(parentData as { programAccess?: PA }).programAccess ?? {
			nutrition: true,
			sport: true
		};

	const todayStart = startOfUtcDay();

	const [activeTasks, optOuts, todayCompletions, pointEvents] = await Promise.all([
		prisma.dailyTask.findMany({
			where: { active: true },
			select: { id: true, label: true, points: true, order: true },
			orderBy: { order: 'asc' }
		}),
		prisma.userDailyTaskOptOut.findMany({
			where: { userId },
			select: { taskId: true }
		}),
		prisma.dailyTaskCompletion.findMany({
			where: { userId, date: todayStart },
			select: { taskId: true }
		}),
		prisma.pointEvent.findMany({ where: { userId }, select: { amount: true } }),
	]);

	const optOutIds = new Set(optOuts.map((o) => o.taskId));
	const completedIds = new Set(todayCompletions.map((c) => c.taskId));
	const tasks = activeTasks
		.filter((t) => !optOutIds.has(t.id))
		.map((t) => ({ ...t, completed: completedIds.has(t.id) }));

	const validated = todayCompletions.length > 0;
	const pointsEarned = validated
		? tasks.filter((t) => t.completed).reduce((sum, t) => sum + t.points, 0)
		: 0;

	const totalPoints = pointEvents.reduce((s, e) => s + e.amount, 0);
	const { levelData, levelPercent } = computeLevel(totalPoints);

	return {
		user: locals.user,
		tasks,
		validated,
		pointsEarned,
		totalPoints,
		levelData,
		levelPercent,
		programAccess
	};
};

export const actions: Actions = {
	validateChecklist: async ({ request, locals }) => {
		if (!locals.user) return fail(401);
		const userId = locals.user.id;
		const todayStart = startOfUtcDay();

		const existing = await prisma.dailyTaskCompletion.count({
			where: { userId, date: todayStart }
		});
		if (existing > 0) {
			return fail(409, { message: 'Checklist déjà validée pour aujourd\'hui.' });
		}

		const data = await request.formData();
		const checkedIds = data.getAll('taskIds') as string[];

		if (checkedIds.length === 0) {
			return fail(400, { message: 'Aucune tâche sélectionnée.' });
		}

		const tasks = await prisma.dailyTask.findMany({
			where: { id: { in: checkedIds }, active: true },
			select: { id: true, points: true }
		});

		const totalPoints = tasks.reduce((sum, t) => sum + t.points, 0);

		await prisma.$transaction([
			prisma.dailyTaskCompletion.createMany({
				data: tasks.map((t) => ({
					userId,
					taskId: t.id,
					date: todayStart
				}))
			}),
			...(totalPoints > 0
				? [
						prisma.pointEvent.create({
							data: {
								userId,
								type: 'DAILY_TASK',
								amount: totalPoints,
								metadata: { source: 'checklist', date: todayStart.toISOString() }
							}
						})
					]
				: [])
		]);

		return { success: true, pointsEarned: totalPoints };
	},

	// ── DEV ONLY : remet à zéro la checklist du jour ──────────────────────
	resetChecklist: async ({ locals }) => {
		if (!locals.user) return fail(401);
		if (process.env.NODE_ENV === 'production') return fail(403);
		const userId = locals.user.id;
		const todayStart = startOfUtcDay();

		await prisma.$transaction([
			prisma.dailyTaskCompletion.deleteMany({ where: { userId, date: todayStart } }),
			prisma.pointEvent.deleteMany({
				where: {
					userId,
					type: 'DAILY_TASK',
					createdAt: { gte: todayStart }
				}
			}),
		]);

		return { success: true };
	}
};

