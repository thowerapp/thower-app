// src/routes/user/+layout.server.ts
// Calcule les compteurs "en attente" qui pilotent les indicateurs visuels
// (pin-dot dans la barre basse, classes .pending, flammes)

import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { prisma } from '$lib/server';
import { getProgramOfferEntitlements } from '$lib/prisma';
import { checkUserAppAccess } from '$lib/server/access';
import { getBodyMeasurementsByUserId } from '$lib/prisma/bodyMeasurement/getBodyMeasurementsByUserId';
import {
	currentProgramDayIndex,
	isProgramAwaitingStart,
	startOfUtcDay
} from '$lib/utils/programDay';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/auth/login');

	const userId = locals.user.id;
	const todayStart = startOfUtcDay();

	const [bodyMeasurements, fetchedProgramAccess, user] = await Promise.all([
		getBodyMeasurementsByUserId(userId, 1),
		getProgramOfferEntitlements(userId),
		prisma.user.findUnique({ where: { id: userId }, select: { programStartDate: true } })
	]);
	const hasMeasurements = bodyMeasurements.length > 0;

	checkUserAppAccess(locals, hasMeasurements);

	const programAccess =
		locals.user.role === 'ADMIN' ? { nutrition: true, sport: true } : fetchedProgramAccess;

	try {
		// ── 1. Séance du jour ─────────────────────────────────────────────
		// On calcule le dayIndex courant depuis programStartDate
		const programStart = user?.programStartDate ?? null;
		const currentDayIndex = currentProgramDayIndex(programStart);
		const programAwaitingStart = isProgramAwaitingStart(programStart);

		if (programAwaitingStart || currentDayIndex < 1) {
			return {
				pending: {
					seance: false,
					tasks: 0,
					repas: false,
					photos: false,
					journee: false
				},
				currentDayIndex: 0,
				programStartDate: programStart?.toISOString() ?? null,
				programAwaitingStart,
				programAccess,
				optOutTaskIds: [] as string[],
				completedTaskIds: [] as string[]
			};
		}

		const currentMonth = Math.ceil(currentDayIndex / 30);

		// Séance, tâches, repas et photos du jour sont indépendants : une seule vague de requêtes.
		const [workoutDone, activeTasks, optOuts, todayCompletions, todayNutrition, photosTaken] =
			await Promise.all([
				prisma.userWorkoutDay.findFirst({
					where: { userId, dayIndex: currentDayIndex, completedAt: { not: null } },
					select: { id: true }
				}),
				prisma.dailyTask.findMany({
					where: { active: true },
					select: { id: true }
				}),
				prisma.userDailyTaskOptOut.findMany({
					where: { userId },
					select: { taskId: true }
				}),
				prisma.dailyTaskCompletion.findMany({
					where: { userId, date: todayStart },
					select: { taskId: true }
				}),
				prisma.nutritionDay.findFirst({
					where: { userId, dayIndex: currentDayIndex },
					select: { meals: { select: { id: true } } }
				}),
				prisma.progressPhoto.count({
					where: { userId, month: currentMonth }
				})
			]);

		const seancePending = workoutDone === null;

		const optOutTaskIds = optOuts.map((o) => o.taskId);
		const completedTaskIds = todayCompletions.map((c) => c.taskId);
		const optOutIds = new Set(optOutTaskIds);
		const completedIds = new Set(completedTaskIds);
		const relevantTasks = activeTasks.filter((t) => !optOutIds.has(t.id));
		const checklistValidated = todayCompletions.length > 0;
		const pendingTasksCount = checklistValidated
			? 0
			: relevantTasks.filter((t) => !completedIds.has(t.id)).length;

		// On attend 3 repas par jour sur le planning (le jeûne masque le petit-déj à l'affichage uniquement).
		const mealCount = todayNutrition?.meals?.length ?? 0;
		const repasNonPlanifie = mealCount < 3;
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
			programStartDate: programStart?.toISOString() ?? null,
			programAwaitingStart: false,
			programAccess,
			optOutTaskIds,
			completedTaskIds
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
			currentDayIndex: 0,
			programStartDate: null,
			programAwaitingStart: false,
			programAccess,
			optOutTaskIds: [] as string[],
			completedTaskIds: [] as string[]
		};
	}
};
