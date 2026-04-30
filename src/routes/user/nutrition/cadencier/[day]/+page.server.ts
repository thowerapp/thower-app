import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server';
import type { ActivityLevel, MealPosition } from '@prisma/client';
import {
	targetCaloriesPerDay,
	dailyProteinTargetG,
	dailyFiberTargetG,
	dailyWaterLitersMin
} from '$lib/nutrition/nutritionTargets';
import { breadMacrosForGrams, type BreadTypeValue } from '$lib/schema/profile/breadType';
import { scaledIngredientGrams } from '$lib/nutrition/scaleMealIngredients';

const TOTAL_DAYS = 91;

type DayIngredientDTO = {
	name: string;
	quantityG: number | null;
	scaledG: number | null;
	unit: string | null;
	category: string | null;
	isOptional: boolean;
	note: string | null;
};

type DayMealDTO = {
	id: string;
	position: MealPosition;
	slotIndex: number;
	label: string;
	timeLabel: string;
	isManual: boolean;
	quantityG: number | null;
	referenceYieldG: number | null;
	servings: number;
	recipeId: string | null;
	recipeName: string;
	description: string | null;
	totalTimeMin: number | null;
	instructions: string | null;
	allergens: string[];
	ingredients: DayIngredientDTO[];
	calories: number;
	proteinG: number;
	carbsG: number;
	fatG: number;
	fiberG: number;
};

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

function mealMacrosRounded(m: {
	isManual: boolean;
	manualCalories: number | null;
	calcCalories: number | null;
	manualProteinG: number | null;
	calcProteinG: number | null;
	manualCarbsG: number | null;
	calcCarbsG: number | null;
	manualFatG: number | null;
	calcFatG: number | null;
	manualFiberG: number | null;
	calcFiberG: number | null;
}) {
	const manual = m.isManual === true;
	return {
		calories: Math.round(manual ? (m.manualCalories ?? 0) : (m.calcCalories ?? 0)),
		proteinG:
			Math.round((manual ? (m.manualProteinG ?? 0) : (m.calcProteinG ?? 0)) * 10) / 10,
		carbsG: Math.round((manual ? (m.manualCarbsG ?? 0) : (m.calcCarbsG ?? 0)) * 10) / 10,
		fatG: Math.round((manual ? (m.manualFatG ?? 0) : (m.calcFatG ?? 0)) * 10) / 10,
		fiberG: Math.round((manual ? (m.manualFiberG ?? 0) : (m.calcFiberG ?? 0)) * 10) / 10
	};
}

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const userId = locals.user.id;
	const raw = params.day ?? '';
	const dayIndex = Number.parseInt(raw, 10);
	if (!Number.isInteger(dayIndex) || dayIndex < 1 || dayIndex > TOTAL_DAYS) {
		throw error(404, 'Jour invalide');
	}

	const profile = await prisma.userProfile.findUnique({
		where: { userId },
		select: {
			activityLevel: true,
			bodyFatPercent: true,
			weightLossGoalKg: true,
			breadDaily: true,
			breadGramsPerDay: true,
			breadType: true,
			intermittentFastingMorning: true
		}
	});
	const intermittentFasting = profile?.intermittentFastingMorning ?? false;

	const lastMeasure = await prisma.bodyMeasurement.findFirst({
		where: { userId },
		orderBy: { createdAt: 'desc' },
		select: { weightKg: true }
	});
	const weightKg = lastMeasure?.weightKg ?? null;

	let breadKcal = 0;
	if (
		profile?.breadDaily &&
		profile.breadType &&
		profile.breadGramsPerDay != null &&
		profile.breadGramsPerDay > 0
	) {
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

	const mealBudgetKcal =
		targetKcal != null ? Math.max(0, Math.round(targetKcal - breadKcal)) : null;

	const targetProteinG =
		weightKg != null &&
		weightKg > 0 &&
		profile?.bodyFatPercent != null &&
		profile.bodyFatPercent >= 3 &&
		profile.bodyFatPercent <= 70
			? Math.round(dailyProteinTargetG(weightKg, profile.bodyFatPercent) * 10) / 10
			: null;

	const targetFiberG = targetKcal != null ? Math.round(dailyFiberTargetG(targetKcal) * 10) / 10 : null;

	const workoutRow = await prisma.userWorkoutDay.findFirst({
		where: { userId, dayIndex },
		select: { id: true }
	});
	const workoutDay = workoutRow != null;
	const dailyWaterL =
		weightKg != null && weightKg > 0 ? Math.round(dailyWaterLitersMin(weightKg, workoutDay) * 100) / 100 : null;

	const nutritionDay = await prisma.nutritionDay.findUnique({
		where: { userId_dayIndex: { userId, dayIndex } },
		include: {
			meals: {
				include: {
					recipe: {
						include: {
							ingredients: { orderBy: { order: 'asc' } }
						}
					}
				}
			}
		}
	});

	const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
	const dow = (dayIndex - 1) % 7;

	const weekNum = Math.min(13, Math.max(1, Math.ceil(dayIndex / 7)));

	if (!nutritionDay) {
		return {
			dayIndex,
			weekNum,
			dayName: dayNames[dow] ?? '—',
			dayNumInWeek: dow + 1,
			hasPlan: false,
			intermittentFasting,
			meals: [] as DayMealDTO[],
			dayTotals: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
			targetKcal,
			mealBudgetKcal,
			breadKcal: breadKcal > 0 ? Math.round(breadKcal) : null,
			targetProteinG,
			targetFiberG,
			dailyWaterL,
			workoutDay,
			hasProfileForTargets: weightKg != null && weightKg > 0
		};
	}

	const sorted = [...nutritionDay.meals].sort(
		(a, b) => positionOrder(a.position) - positionOrder(b.position)
	);

	let totC = 0;
	let totP = 0;
	let totCb = 0;
	let totF = 0;
	let totFib = 0;

	const meals: DayMealDTO[] = sorted.map((m, slotIndex) => {
		const macros = mealMacrosRounded(m);
		totC += macros.calories;
		totP += macros.proteinG;
		totCb += macros.carbsG;
		totF += macros.fatG;
		totFib += macros.fiberG;

		const r = m.recipe;
		const refYield = r?.referenceYieldG ?? null;

		const ingredients: DayIngredientDTO[] =
			r?.ingredients.map((ing) => {
				const scaledG = scaledIngredientGrams(ing.quantityG, m.quantityG, refYield);
				return {
					name: ing.name,
					quantityG: ing.quantityG,
					scaledG,
					unit: ing.unit,
					category: ing.category,
					isOptional: ing.isOptional,
					note: ing.note
				};
			}) ?? [];

		return {
			id: m.id,
			position: m.position,
			slotIndex: slotIndex + 1,
			label: `Repas ${slotIndex + 1} — ${positionLabel(m.position)}`,
			timeLabel: defaultTimeLabel(m.position),
			isManual: m.isManual,
			quantityG: m.quantityG,
			referenceYieldG: r?.referenceYieldG ?? null,
			servings: r?.servings ?? 1,
			recipeId: r?.id ?? null,
			recipeName: r?.name?.trim() ? r.name : 'Non planifié',
			description: r?.description ?? null,
			totalTimeMin: r?.totalTimeMin ?? null,
			instructions: r?.instructions ?? null,
			allergens: r?.allergens ?? [],
			ingredients,
			...macros
		};
	});

	return {
		dayIndex,
		weekNum,
		dayName: dayNames[dow] ?? '—',
		dayNumInWeek: dow + 1,
		hasPlan: true,
		intermittentFasting,
		meals,
		dayTotals: {
			calories: Math.round(totC),
			proteinG: Math.round(totP * 10) / 10,
			carbsG: Math.round(totCb * 10) / 10,
			fatG: Math.round(totF * 10) / 10,
			fiberG: Math.round(totFib * 10) / 10
		},
		targetKcal,
		mealBudgetKcal,
		breadKcal: breadKcal > 0 ? Math.round(breadKcal) : null,
		targetProteinG,
		targetFiberG,
		dailyWaterL,
		workoutDay,
		hasProfileForTargets: weightKg != null && weightKg > 0
	};
};
