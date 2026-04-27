// src/routes/user/journee/+page.server.ts
// Charge les tâches journalières + état de complétion du jour

import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server';

function startOfUtcDay(d: Date = new Date()): Date {
	const r = new Date(d);
	r.setUTCHours(0, 0, 0, 0);
	return r;
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/auth/login');

	const userId = locals.user.id;
	const todayStart = startOfUtcDay();

	const [tasks, optOuts, completions] = await Promise.all([
		prisma.dailyTask.findMany({
			where: { active: true },
			orderBy: { order: 'asc' },
			select: { id: true, label: true, points: true, order: true }
		}),
		prisma.userDailyTaskOptOut.findMany({
			where: { userId },
			select: { taskId: true }
		}),
		prisma.dailyTaskCompletion.findMany({
			where: { userId, date: todayStart },
			select: { taskId: true }
		})
	]);

	const optOutIds = new Set(optOuts.map((o) => o.taskId));
	const completedIds = new Set(completions.map((c) => c.taskId));

	const items = tasks
		.filter((t) => !optOutIds.has(t.id))
		.map((t) => ({
			id: t.id,
			label: t.label,
			pts: t.points,
			done: completedIds.has(t.id)
		}));
	const validated = completions.length > 0;
	const pointsEarned = validated
		? items.filter((item) => item.done).reduce((sum, item) => sum + item.pts, 0)
		: 0;

	// Fallback si aucune tâche en base (setup pas encore fait)
	const fallback = [
		{ id: '__water',      label: "Boire 2L d'eau",       pts: 5,  done: false },
		{ id: '__meditation', label: '10 min de méditation',  pts: 5,  done: false },
		{ id: '__nosugar',    label: 'Pas de sucre ajouté',   pts: 5,  done: false },
		{ id: '__coffeemax',  label: 'Max 4 cafés',           pts: 5,  done: false },
		{ id: '__coffeetime', label: 'Pas de café après 14h', pts: 5,  done: false },
		{ id: '__notobacco',  label: 'Pas de tabac',          pts: 10, done: false }
	];

	return {
		items: items.length > 0 ? items : fallback,
		validated,
		pointsEarned,
		todayLabel: new Intl.DateTimeFormat('fr-FR', {
			weekday: 'long',
			day: 'numeric',
			month: 'long'
		}).format(new Date())
	};
};

export const actions: Actions = {
	validateChecklist: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Non authentifié.' });

		const userId = locals.user.id;
		const todayStart = startOfUtcDay();

		const existing = await prisma.dailyTaskCompletion.count({
			where: { userId, date: todayStart }
		});
		if (existing > 0) {
			return fail(409, { message: 'Checklist déjà validée pour aujourd\'hui.' });
		}

		const formData = await request.formData();
		const checkedIds = formData
			.getAll('taskIds')
			.map((value) => String(value))
			.filter((value) => value.length > 0 && !value.startsWith('__'));

		if (checkedIds.length === 0) {
			return fail(400, { message: 'Aucune tâche sélectionnée.' });
		}

		const tasks = await prisma.dailyTask.findMany({
			where: { id: { in: checkedIds }, active: true },
			select: { id: true, points: true }
		});

		const totalPoints = tasks.reduce((sum, task) => sum + task.points, 0);

		await prisma.$transaction([
			prisma.dailyTaskCompletion.createMany({
				data: tasks.map((task) => ({
					userId,
					taskId: task.id,
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
								metadata: {
									source: 'journee-checklist',
									date: todayStart.toISOString()
								}
							}
						})
					]
				: [])
		]);

		return { success: true, pointsEarned: totalPoints };
	}
};
