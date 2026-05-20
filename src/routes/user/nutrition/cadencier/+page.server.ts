import { error, fail, redirect } from '@sveltejs/kit';
import { requireNutritionAccess } from '$lib/server/programAccessGuard';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server';
import type { ActivityLevel, MealPosition, Prisma } from '@prisma/client';
import {
	currentProgramDayIndex,
	TOTAL_PROGRAM_DAYS,
	TOTAL_PROGRAM_WEEKS
} from '$lib/utils/programDay';
import {
	targetCaloriesPerDay,
	dailyProteinTargetG,
	dailyFiberTargetG
} from '$lib/nutrition/nutritionTargets';
import { breadMacrosForGrams, type BreadTypeValue } from '$lib/schema/profile/breadType';
import {
	ensureBreakfastMealForDay,
	backfillMissingBreakfastMeals,
	loadBreakfastBackfillContextFromProfile,
	loadBreakfastBackfillContext,
	type BreakfastProfileInput
} from '$lib/server/nutrition/ensureBreakfastMeal';

const TOTAL_DAYS = TOTAL_PROGRAM_DAYS;
const WEEKS = TOTAL_PROGRAM_WEEKS;

function positionLabel(position: MealPosition): string {
	switch (position) {
		case 'BREAKFAST':
			return 'Petit-déjeuner';
		case 'LUNCH':
			return 'Déjeuner';
		case 'DINNER':
			return 'Dîner';
		default:
			return 'Repas';
	}
}

function positionOrder(position: MealPosition): number {
	switch (position) {
		case 'BREAKFAST':
			return 0;
		case 'LUNCH':
			return 1;
		case 'DINNER':
			return 2;
		default:
			return 3;
	}
}

function defaultTimeLabel(position: MealPosition): string {
	switch (position) {
		case 'BREAKFAST':
			return '08h00';
		case 'LUNCH':
			return '12h30';
		case 'DINNER':
			return '19h00';
		default:
			return '—';
	}
}

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

/** Ligne User attendue après findUnique (select ci-dessous). */
type CadencierUserRow = {
	programStartDate: Date | null;
	nutritionDaysAllocated: number;
	profile: { intermittentFastingMorning: boolean | null } | null;
};

/** Même motif que generateProgramForUser : UserSelect parfois désynchronisé côté types. */
const cadencierUserSelect = {
	programStartDate: true,
	nutritionDaysAllocated: true,
	profile: { select: { intermittentFastingMorning: true } }
} as unknown as Prisma.UserSelect;

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const userId = locals.user.id;

	const user = (await prisma.user.findUnique({
		where: { id: userId },
		select: cadencierUserSelect
	})) as CadencierUserRow | null;

	const currentDayIndex = currentProgramDayIndex(user?.programStartDate ?? null);
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

	const nutritionDayQuery = {
		where: { userId, dayIndex: { gte: weekStart, lte: weekEnd } },
		orderBy: { dayIndex: 'asc' as const },
		include: {
			meals: {
				include: {
					recipe: { select: { id: true, name: true } }
				}
			}
		}
	};

	const [profile, lastMeasure, rowsInitial] = await Promise.all([
		prisma.userProfile.findUnique({
			where: { userId },
			select: {
				allergens: true,
				otherAllergens: true,
				disgustingFoods: true,
				activityLevel: true,
				bodyFatPercent: true,
				weightLossGoalKg: true,
				breadDaily: true,
				breadGramsPerDay: true,
				breadType: true
			}
		}),
		prisma.bodyMeasurement.findFirst({
			where: { userId },
			orderBy: { createdAt: 'desc' },
			select: { weightKg: true }
		}),
		prisma.nutritionDay.findMany(nutritionDayQuery)
	]);

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
		const row = byIndex.get(dayIndex);
		const dow = (dayIndex - 1) % 7;
		const sortedMeals = row
			? [...row.meals].sort((a, b) => positionOrder(a.position) - positionOrder(b.position))
			: [];
		const meals: CadencierMealDTO[] = sortedMeals.map((m, slotIndex) => {
			const manual = m.isManual === true;
			const calories = Math.round(
				manual ? (m.manualCalories ?? 0) : (m.calcCalories ?? 0)
			);
			const proteinG = Math.round(
				(manual ? (m.manualProteinG ?? 0) : (m.calcProteinG ?? 0)) * 10
			) / 10;
			const carbsG = Math.round(
				(manual ? (m.manualCarbsG ?? 0) : (m.calcCarbsG ?? 0)) * 10
			) / 10;
			const fatG = Math.round(
				(manual ? (m.manualFatG ?? 0) : (m.calcFatG ?? 0)) * 10
			) / 10;
			const fiberG = Math.round(
				(manual ? (m.manualFiberG ?? 0) : (m.calcFiberG ?? 0)) * 10
			) / 10;
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

	const weightKg = lastMeasure?.weightKg ?? null;

	let breadKcal = 0;
	if (profile?.breadDaily && profile.breadType && profile.breadGramsPerDay != null && profile.breadGramsPerDay > 0) {
		breadKcal = breadMacrosForGrams(profile.breadType as BreadTypeValue, profile.breadGramsPerDay).kcal;
	}

	const targetKcal =
		weightKg != null && weightKg > 0
			? targetCaloriesPerDay({
					weightKg,
					bodyFatPercent: profile?.bodyFatPercent,
					activityLevel: profile?.activityLevel as ActivityLevel | null | undefined,
					weightLossGoalKg: profile?.weightLossGoalKg
				})
			: null;

	const mealBudgetKcal = targetKcal != null ? Math.max(0, Math.round(targetKcal - breadKcal)) : null;

	const targetProteinG =
		weightKg != null && weightKg > 0 && profile?.bodyFatPercent != null && profile.bodyFatPercent >= 3 && profile.bodyFatPercent <= 70
			? Math.round(dailyProteinTargetG(weightKg, profile.bodyFatPercent) * 10) / 10
			: null;

	const targetFiberG = targetKcal != null ? Math.round(dailyFiberTargetG(targetKcal) * 10) / 10 : null;

	return {
		currentDayIndex,
		currentWeek,
		selectedWeek,
		weekStart,
		weekEnd,
		weekDays,
		defaultSelectedDay,
		nutritionDaysAllocated: user?.nutritionDaysAllocated ?? 0,
		hasProgramStart: user?.programStartDate != null,
		intermittentFasting: user?.profile?.intermittentFastingMorning ?? false,
		targetKcal: mealBudgetKcal,
		targetProteinG,
		targetFiberG
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
		const dayIndex = Number.parseInt(String(dayIndexRaw ?? ''), 10);
		if (!Number.isInteger(dayIndex) || dayIndex < 1 || dayIndex > TOTAL_DAYS) {
			return fail(400, { error: 'Jour invalide' });
		}

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
				update: { intermittentFastingMorning: active },
			});
			return { success: true };
		} catch {
			return fail(500, { error: 'Erreur serveur' });
		}
	}
};
