// src/routes/user/journee/+page.server.ts
// Charge les tâches journalières + état de complétion du jour

import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server';
import { currentProgramDayIndex, startOfUtcDay } from '$lib/utils/programDay';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/auth/login');

	const userId = locals.user.id;
	const todayStart = startOfUtcDay();

	const [tasks, optOuts, completions] = await Promise.all([
		prisma.dailyTask.findMany({
			where: { active: true },
			orderBy: { order: 'asc' },
			select: {
				id: true,
				label: true,
				points: true,
				order: true,
				type: true,
				showFromDay: true,
				showUntilDay: true,
				discoveryContent: {
					select: {
						id: true,
						title: true,
						cloudflareUid: true,
						thumbnailUrl: true,
						durationSeconds: true,
						category: true
					}
				}
			}
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

	// ── Jour courant du programme ──────────────────────────────────────────
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { programStartDate: true }
	});
	const currentDayIndex = currentProgramDayIndex(user?.programStartDate ?? null);

	const isVisible = (t: { showFromDay: number | null; showUntilDay: number | null }) => {
		if (t.showFromDay != null && currentDayIndex < t.showFromDay) return false;
		if (t.showUntilDay != null && currentDayIndex > t.showUntilDay) return false;
		return true;
	};

	console.log('[journee/load] currentDayIndex =', currentDayIndex, '| tasks en DB =', tasks.length);
	tasks.forEach((t) => {
		const visible = isVisible(t);
		console.log(
			`  task id=${t.id} label="${t.label}" type=${t.type ?? 'NULL'} discoveryContentId=${(t as any).discoveryContentId ?? 'none'} showFrom=${t.showFromDay} showUntil=${t.showUntilDay} visible=${visible}`
		);
	});

	const items = tasks
		.filter((t) => !optOutIds.has(t.id) && isVisible(t))
		.map((t) => ({
			id: t.id,
			label: t.label,
			pts: t.points,
			done: completedIds.has(t.id),
			type: (t.type ?? 'STANDARD') as 'STANDARD' | 'VIDEO',
			video: t.discoveryContent
				? {
						id: t.discoveryContent.id,
						title: t.discoveryContent.title,
						cloudflareUid: t.discoveryContent.cloudflareUid,
						thumbnailUrl: t.discoveryContent.thumbnailUrl ?? null,
						durationSeconds: t.discoveryContent.durationSeconds ?? null,
						category: t.discoveryContent.category
					}
				: null
		}));

	if (tasks.length === 0) {
		console.warn(
			'[journee/load] Aucune DailyTask active en base — lancer `npm run seed` sur cette base (catalogue partagé).'
		);
	} else if (items.length === 0) {
		console.warn(
			'[journee/load] items visibles = 0 (filtre jour',
			currentDayIndex,
			'ou opt-out) — fallback UI activé'
		);
	}
	console.log('[journee/load] items visibles =', items.length, '| fallback =', items.length === 0);
	items.forEach((i) => {
		console.log(`  item id=${i.id} label="${i.label}" type=${i.type} video=${i.video ? i.video.category + '/' + i.video.id : 'null'}`);
	});

	// validated = les tâches STANDARD ont été soumises manuellement aujourd'hui
	const standardItems = items.filter((i) => i.type === 'STANDARD');
	const validated = standardItems.some((i) => i.done);
	const pointsEarned = validated
		? standardItems.filter((i) => i.done).reduce((sum, i) => sum + i.pts, 0)
		: 0;

	// Points VIDEO déjà gagnés automatiquement (visionnage)
	const pointsVideoEarned = items
		.filter((i) => i.type === 'VIDEO' && i.done)
		.reduce((sum, i) => sum + i.pts, 0);

	// Fallback si aucune tâche en base (setup pas encore fait)
	const fallback = [
		{ id: '__water',      label: "Boire 2L d'eau",       pts: 5,  done: false, type: 'STANDARD' as const, video: null },
		{ id: '__meditation', label: '10 min de méditation',  pts: 5,  done: false, type: 'STANDARD' as const, video: null },
		{ id: '__nosugar',    label: 'Pas de sucre ajouté',   pts: 5,  done: false, type: 'STANDARD' as const, video: null },
		{ id: '__coffeemax',  label: 'Max 4 cafés',           pts: 5,  done: false, type: 'STANDARD' as const, video: null },
		{ id: '__coffeetime', label: 'Pas de café après 14h', pts: 5,  done: false, type: 'STANDARD' as const, video: null },
		{ id: '__notobacco',  label: 'Pas de tabac',          pts: 10, done: false, type: 'STANDARD' as const, video: null }
	];

	return {
		items: items.length > 0 ? items : fallback,
		validated,
		pointsEarned,
		pointsVideoEarned,
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

		const formData = await request.formData();
		const checkedIds = formData
			.getAll('taskIds')
			.map((value) => String(value))
			.filter((value) => value.length > 0 && !value.startsWith('__'));

		if (checkedIds.length === 0) {
			return fail(400, { message: 'Aucune tâche sélectionnée.' });
		}

		// Seulement les tâches STANDARD parmi les IDs soumis
		// (les tâches VIDEO sont auto-complétées via le heartbeat vidéo)
		const tasks = await prisma.dailyTask.findMany({
			where: { id: { in: checkedIds }, active: true, type: 'STANDARD' },
			select: { id: true, points: true }
		});

		if (tasks.length === 0) {
			return fail(400, { message: 'Aucune tâche valide sélectionnée.' });
		}

		// Guard 409 : seulement sur les tâches STANDARD soumises (pas les VIDEO auto-complétées)
		const taskIds = tasks.map((t) => t.id);
		const existing = await prisma.dailyTaskCompletion.count({
			where: { userId, date: todayStart, taskId: { in: taskIds } }
		});
		if (existing > 0) {
			return fail(409, { message: 'Checklist déjà validée pour aujourd\'hui.' });
		}

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
