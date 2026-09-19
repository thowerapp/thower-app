import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server';
import type { PageServerLoad, Actions } from './$types';
import { startOfUtcDay } from '$lib/utils/programDay';
import { computeLevel } from '$lib/utils/levels';

export const load: PageServerLoad = async ({ locals, parent }) => {
	if (!locals.user) throw redirect(302, '/auth/login');
	const userId = locals.user.id;

	const parentData = await parent();
	type PA = { nutrition: boolean; sport: boolean };
	type ParentShape = {
		programAccess?: PA;
		currentDayIndex?: number;
		programAwaitingStart?: boolean;
		programStartDate?: string | null;
		optOutTaskIds?: string[];
		completedTaskIds?: string[];
	};
	const p = parentData as ParentShape;
	const programAccess: PA = p.programAccess ?? { nutrition: true, sport: true };
	const currentDayIndex = p.currentDayIndex ?? 0;
	const programAwaitingStart = p.programAwaitingStart ?? false;
	const programStart = p.programStartDate ?? null;

	const [activeTasks, pointEvents] = await Promise.all([
		prisma.dailyTask.findMany({
			where: { active: true },
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
			},
			orderBy: { order: 'asc' }
		}),
		prisma.pointEvent.findMany({ where: { userId }, select: { amount: true } })
	]);

	const isVisible = (t: { showFromDay: number | null; showUntilDay: number | null }) => {
		if (t.showFromDay != null && currentDayIndex < t.showFromDay) return false;
		if (t.showUntilDay != null && currentDayIndex > t.showUntilDay) return false;
		return true;
	};

	const optOutIds = new Set(p.optOutTaskIds ?? []);
	const completedIds = new Set(p.completedTaskIds ?? []);
	const tasks = activeTasks
		.filter((t) => !optOutIds.has(t.id) && isVisible(t))
		.map((t) => ({
			id: t.id,
			label: t.label,
			points: t.points,
			order: t.order,
			type: (t.type ?? 'STANDARD') as 'STANDARD' | 'VIDEO',
			completed: completedIds.has(t.id),
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

	const standardTasks = tasks.filter((t) => t.type === 'STANDARD');
	const validated = standardTasks.some((t) => t.completed);
	const pointsEarned = validated
		? standardTasks.filter((t) => t.completed).reduce((sum, t) => sum + t.points, 0)
		: 0;

	const totalPoints = pointEvents.reduce((s, e) => s + e.amount, 0);
	const { levelData, levelPercent } = computeLevel(totalPoints);

	return {
		user: locals.user,
		tasks: programAwaitingStart ? [] : tasks,
		validated,
		pointsEarned,
		totalPoints,
		levelData,
		levelPercent,
		programAccess,
		programAwaitingStart,
		programStartsAt: programStart
	};
};

export const actions: Actions = {
	validateChecklist: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Non authentifié.' });
		const userId = locals.user.id;
		const todayStart = startOfUtcDay();

		const data = await request.formData();
		const checkedIds = data.getAll('taskIds') as string[];

		if (checkedIds.length === 0) {
			return fail(400, { message: 'Aucune tâche sélectionnée.' });
		}

		const tasks = await prisma.dailyTask.findMany({
			where: { id: { in: checkedIds }, active: true, type: 'STANDARD' },
			select: { id: true, points: true }
		});

		if (tasks.length === 0) {
			return fail(400, { message: 'Aucune tâche valide sélectionnée.' });
		}

		// Garde 409 : uniquement sur les tâches STANDARD soumises (pas sur les tâches
		// VIDEO auto-complétées, sinon avoir regardé la vidéo bloquerait la checklist).
		const taskIds = tasks.map((t) => t.id);
		const existing = await prisma.dailyTaskCompletion.count({
			where: { userId, date: todayStart, taskId: { in: taskIds } }
		});
		if (existing > 0) {
			return fail(409, { message: 'Checklist déjà validée pour aujourd\'hui.' });
		}

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

