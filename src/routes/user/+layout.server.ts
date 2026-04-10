// src/routes/user/+layout.server.ts
// Calcule les compteurs "en attente" qui pilotent les indicateurs visuels
// (pin-dot dans la barre basse, classes .pending, flammes)

import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { prisma } from '$lib/server';

function startOfUtcDay(d: Date = new Date()): Date {
	const r = new Date(d);
	r.setUTCHours(0, 0, 0, 0);
	return r;
}

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/auth/login');

	const userId = locals.user.id;
	const todayStart = startOfUtcDay();

	try {
		// ── 1. Séance du jour ─────────────────────────────────────────────
		// On calcule le dayIndex courant depuis programStartDate
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { programStartDate: true }
		});

		let currentDayIndex = 1;
		const programStart = user?.programStartDate;
		if (programStart) {
			const diff = Math.floor(
				(todayStart.getTime() - startOfUtcDay(programStart).getTime()) / 86_400_000
			);
			currentDayIndex = Math.min(Math.max(diff + 1, 1), 91);
		}

		// Y a-t-il une séance validée aujourd'hui pour ce dayIndex ?
		const workoutDone = await prisma.userWorkoutDay.findFirst({
			where: {
				userId,
				dayIndex: currentDayIndex,
				completedAt: { not: null }
			},
			select: { id: true }
		});
		const seancePending = workoutDone === null;

		// ── 2. Tâches journalières non complétées ─────────────────────────
		const [activeTasks, optOuts, todayCompletions] = await Promise.all([
			prisma.dailyTask.findMany({
				where: { active: true },
				select: { id: true }
			}),
			prisma.userDailyTaskOptOut.findMany({
				where: { userId },
				select: { taskId: true }
			}),
			prisma.dailyTaskCompletion.findMany({
				where: {
					userId,
					date: todayStart
				},
				select: { taskId: true }
			})
		]);

		const optOutIds = new Set(optOuts.map((o) => o.taskId));
		const completedIds = new Set(todayCompletions.map((c) => c.taskId));
		const relevantTasks = activeTasks.filter((t) => !optOutIds.has(t.id));
		const pendingTasksCount = relevantTasks.filter((t) => !completedIds.has(t.id)).length;

		// ── 3. Repas non planifiés aujourd'hui ────────────────────────────
		const todayNutrition = await prisma.nutritionDay.findFirst({
			where: { userId, dayIndex: currentDayIndex },
			select: { meals: { select: { id: true } } }
		});
		const mealCount = todayNutrition?.meals?.length ?? 0;
		// On attend 2 repas par jour minimum
		const repasNonPlanifie = mealCount < 2;

		// ── 4. Photos de progression manquantes ce mois ───────────────────
		const currentMonth = Math.ceil(currentDayIndex / 30);
		const photosTaken = await prisma.progressPhoto.count({
			where: { userId, month: currentMonth }
		});
		const photosPending = photosTaken < 3;

		return {
			pending: {
				seance: seancePending,
				tasks: pendingTasksCount,
				repas: repasNonPlanifie,
				photos: photosPending,
				// journée = true si au moins une tâche ou séance en attente
				journee: pendingTasksCount > 0 || seancePending
			},
			currentDayIndex,
			programStartDate: programStart?.toISOString() ?? null
		};
	} catch {
		// En cas d'erreur DB (ex: programme pas encore initialisé), retours neutres
		return {
			pending: {
				seance: false,
				tasks: 0,
				repas: false,
				photos: false,
				journee: false
			},
			currentDayIndex: 1,
			programStartDate: null
		};
	}
};
