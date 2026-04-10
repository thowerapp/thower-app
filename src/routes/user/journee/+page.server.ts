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
		todayLabel: new Intl.DateTimeFormat('fr-FR', {
			weekday: 'long',
			day: 'numeric',
			month: 'long'
		}).format(new Date())
	};
};

export const actions: Actions = {
	toggleTask: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Non authentifié' });

		const userId = locals.user.id;
		const todayStart = startOfUtcDay();
		const data = await request.formData();
		const taskId = data.get('taskId') as string | null;
		const doneStr = data.get('done') as string | null;

		if (!taskId || taskId.startsWith('__')) {
			// Tâche fallback (pas en DB), on ignore silencieusement
			return { success: true };
		}

		const wantsDone = doneStr === 'true';

		try {
			if (wantsDone) {
				// Upsert pour éviter les doublons
				await prisma.dailyTaskCompletion.upsert({
					where: {
						userId_taskId_date: { userId, taskId, date: todayStart }
					},
					create: { userId, taskId, date: todayStart },
					update: {}
				});
			} else {
				await prisma.dailyTaskCompletion.deleteMany({
					where: { userId, taskId, date: todayStart }
				});
			}
			return { success: true };
		} catch (e) {
			console.error('[journée toggleTask]', e);
			return fail(500, { error: 'Erreur serveur' });
		}
	}
};
