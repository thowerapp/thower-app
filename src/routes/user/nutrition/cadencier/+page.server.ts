import { error, fail, redirect } from '@sveltejs/kit';
import { requireNutritionAccess } from '$lib/server/programAccessGuard';
import { defaultTimeLabel, mealMacrosRounded, positionLabel, positionOrder } from '$lib/nutrition/mealDisplay';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server';
import { absoluteDayIndex, programCycleSelect, resolveProgramCycle } from '$lib/utils/programCycle';
import { getUserProgramCycle } from '$lib/server/programCycle';
import type { MealPosition, Prisma } from '@prisma/client';
import { TOTAL_PROGRAM_DAYS, TOTAL_PROGRAM_WEEKS } from '$lib/utils/programDay';
import { mealTargetsFromProfile } from '$lib/server/nutrition/userMealTargets';
import { refreshStaleDays, rescaleDayMeals } from '$lib/server/nutrition/rescaleUserMeals';
import {
	ensureBreakfastMealForDay,
	backfillMissingBreakfastMeals,
	loadBreakfastBackfillContextFromProfile,
	loadBreakfastBackfillContext,
	type BreakfastProfileInput
} from '$lib/server/nutrition/ensureBreakfastMeal';

const TOTAL_DAYS = TOTAL_PROGRAM_DAYS;
const WEEKS = TOTAL_PROGRAM_WEEKS;

type CadencierMealDTO = {
	id: string;
	position: MealPosition;
	slotIndex: number;
	label: string;
	timeLabel: string;
	recipeName: string;
	calories: number;
	proteinG: number;
	carbsG: number;
	fatG: number;
	fiberG: number;
};

type CadencierDayDTO = {
	dayIndex: number;
	dayName: string;
	dayNumInWeek: number;
	isToday: boolean;
	hasPlan: boolean;
	intermittentFasting: boolean;
	meals: CadencierMealDTO[];
};

const cadencierUserSelect = {
	...programCycleSelect,
	nutritionDaysAllocated: true,
	programGenStatus: true,
	profile: { select: { intermittentFastingMorning: true } }
} satisfies Prisma.UserSelect;

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const userId = locals.user.id;

	const [userRaw, profile, lastMeasure] = await Promise.all([
		prisma.user.findUnique({ where: { id: userId }, select: cadencierUserSelect }),
		prisma.userProfile.findUnique({
			where: { userId },
			select: {
				allergens: true,
				otherAllergens: true,
				disgustingFoods: true,
				bodyFatPercent: true,
				activityLevel: true,
				breadDaily: true,
				breadGramsPerDay: true,
				breadType: true
			}
		}),
		prisma.bodyMeasurement.findFirst({
			where: { userId },
			orderBy: { createdAt: 'desc' },
			select: { weightKg: true }
		})
	]);
	const user = userRaw;
	const weightKg = lastMeasure?.weightKg ?? null;
	// Cibles journalières des repas (pain quotidien déduit), partagées avec le recalage des portions.
	const mealTargets = mealTargetsFromProfile(profile, weightKg);

	// Jours relatifs du cycle en cours à l'affichage ; `NutritionDay` est en jour absolu (+ offset).
	const cycle = resolveProgramCycle(user);
	const { offset } = cycle;
	const currentDayIndex = cycle.dayIndex;
	const currentWeek = Math.min(WEEKS, Math.max(1, Math.ceil(currentDayIndex / 7)));

	const rawSemaine = url.searchParams.get('semaine');
	let selectedWeek =
		rawSemaine != null && rawSemaine !== '' ? Number.parseInt(rawSemaine, 10) : NaN;
	if (!Number.isInteger(selectedWeek) || selectedWeek < 1 || selectedWeek > WEEKS) {
		selectedWeek = currentWeek;
	}
	if (rawSemaine !== String(selectedWeek)) {
		const next = new URL(url);
		next.searchParams.set('semaine', String(selectedWeek));
		throw redirect(302, next.pathname + next.search);
	}
	const weekStart = (selectedWeek - 1) * 7 + 1;
	const weekEnd = Math.min(TOTAL_DAYS, weekStart + 6);

	// Portions d'aujourd'hui et des jours suivants alignées sur le calcul actuel avant affichage.
	await refreshStaleDays(userId, weekStart + offset, weekEnd + offset, mealTargets);

	const nutritionDayQuery = {
		where: { userId, dayIndex: { gte: weekStart + offset, lte: weekEnd + offset } },
		orderBy: { dayIndex: 'asc' as const },
		include: {
			meals: {
				include: {
					recipe: { select: { id: true, name: true } }
				}
			}
		}
	};

	const rowsInitial = await prisma.nutritionDay.findMany(nutritionDayQuery);

	let rows = rowsInitial;
	const daysNeedingBreakfast = rows.filter(
		(r) => r.meals.length > 0 && !r.meals.some((m) => m.position === 'BREAKFAST')
	);

	if (daysNeedingBreakfast.length > 0 && profile) {
		const breakfastCtx = await loadBreakfastBackfillContextFromProfile(
			userId,
			profile as BreakfastProfileInput,
			lastMeasure?.weightKg ?? null
		);
		if (breakfastCtx) {
			const backfilled = await backfillMissingBreakfastMeals(
				userId,
				daysNeedingBreakfast.map((r) => ({
					id: r.id,
					dayIndex: r.dayIndex,
					meals: r.meals
				})),
				breakfastCtx
			);
			if (backfilled) {
				rows = await prisma.nutritionDay.findMany(nutritionDayQuery);
			}
		}
	}

	const byIndex = new Map(rows.map((d) => [d.dayIndex, d]));

	const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

	const weekDays: CadencierDayDTO[] = [];
	for (let dayIndex = weekStart; dayIndex <= weekEnd; dayIndex++) {
		const row = byIndex.get(dayIndex + offset);
		const dow = (dayIndex - 1) % 7;
		const sortedMeals = row
			? [...row.meals].sort((a, b) => positionOrder(a.position) - positionOrder(b.position))
			: [];
		const meals: CadencierMealDTO[] = sortedMeals.map((m, slotIndex) => {
			const { calories, proteinG, carbsG, fatG, fiberG } = mealMacrosRounded(m);
			return {
				id: m.id,
				position: m.position,
				slotIndex: slotIndex + 1,
				label: `Repas ${slotIndex + 1} — ${positionLabel(m.position)}`,
				timeLabel: defaultTimeLabel(m.position),
				recipeName: m.recipe?.name?.trim() ? m.recipe.name : 'Non planifié',
				calories,
				proteinG,
				carbsG,
				fatG,
				fiberG
			};
		});

		weekDays.push({
			dayIndex,
			dayName: dayNames[dow] ?? '—',
			dayNumInWeek: dow + 1,
			isToday: dayIndex === currentDayIndex,
			hasPlan: sortedMeals.length > 0,
			intermittentFasting: row?.intermittentFasting ?? false,
			meals
		});
	}

	let defaultSelectedDay = currentDayIndex;
	if (defaultSelectedDay < weekStart || defaultSelectedDay > weekEnd) {
		defaultSelectedDay = weekStart;
	}

	// Cibles arrondies pour l'affichage.
	const dayTargets = mealTargets
		? {
				kcal: Math.round(mealTargets.kcal),
				proteinG: Math.round(mealTargets.proteinG),
				carbsG: Math.round(mealTargets.carbsG),
				fatG: Math.round(mealTargets.fatG),
				fiberG: Math.round(mealTargets.fiberG)
			}
		: null;

	return {
		currentDayIndex,
		currentWeek,
		selectedWeek,
		weekStart,
		weekEnd,
		weekDays,
		defaultSelectedDay,
		// Jours alloués dans le cycle en cours (0..91).
		nutritionDaysAllocated: Math.max(0, Math.min(TOTAL_DAYS, (user?.nutritionDaysAllocated ?? 0) - offset)),
		programCycle: cycle.cycle,
		programGenStatus: user?.programGenStatus ?? null,
		hasProgramStart: user?.programStartDate != null,
		intermittentFasting: user?.profile?.intermittentFastingMorning ?? false,
		dayTargets
	};
};

export const actions: Actions = {
	toggleJeuneDay: async ({ locals, request }) => {
		if (!locals.user) return fail(401, { error: 'Non authentifié' });
		await requireNutritionAccess(locals.user.id, locals.user.role);
		const userId = locals.user.id;
		const data = await request.formData();
		const active = data.get('active') === 'true';
		const dayIndexRaw = data.get('dayIndex');
		const relativeDay = Number.parseInt(String(dayIndexRaw ?? ''), 10);
		if (!Number.isInteger(relativeDay) || relativeDay < 1 || relativeDay > TOTAL_DAYS) {
			return fail(400, { error: 'Jour invalide' });
		}
		// Jour du cycle en cours (relatif) → jour absolu de `NutritionDay`.
		const dayIndex = absoluteDayIndex(await getUserProgramCycle(userId), relativeDay);

		const before = await prisma.nutritionDay.findUnique({
			where: { userId_dayIndex: { userId, dayIndex } },
			select: {
				id: true,
				intermittentFasting: true,
				meals: { select: { position: true } }
			}
		});

		try {
			const updated = await prisma.nutritionDay.updateMany({
				where: { userId, dayIndex },
				data: { intermittentFasting: active }
			});
			if (updated.count === 0) {
				return fail(404, { error: 'Aucun jour de nutrition trouvé pour ce jour' });
			}

			if (!active && before?.id) {
				const ctx = await loadBreakfastBackfillContext(userId);
				if (ctx) {
					await ensureBreakfastMealForDay(userId, dayIndex, before.id, ctx);
				}
			}

			// Déjeuner / dîner passent de 40 % à 50 % du budget (et inversement) : on recalcule les portions.
			if (before?.id && before.intermittentFasting !== active) {
				await rescaleDayMeals(userId, before.id, dayIndex);
			}

			return { success: true };
		} catch {
			return fail(500, { error: 'Erreur serveur' });
		}
	},

	toggleJeune: async ({ locals, request }) => {
		if (!locals.user) return fail(401, { error: 'Non authentifié' });
		await requireNutritionAccess(locals.user.id, locals.user.role);
		const userId = locals.user.id;
		const data = await request.formData();
		const active = data.get('active') === 'true';
		try {
			await prisma.userProfile.upsert({
				where: { userId },
				create: { userId, intermittentFastingMorning: active },
				update: { intermittentFastingMorning: active }
			});
			return { success: true };
		} catch {
			return fail(500, { error: 'Erreur serveur' });
		}
	}
};
