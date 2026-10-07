import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server';
import type { MealPosition } from '@prisma/client';
import { dailyWaterLitersMin } from '$lib/nutrition/nutritionTargets';
import { mealTargetsFromProfile, profileBreadMacros } from '$lib/server/nutrition/userMealTargets';
import { mealIngredientGrams, mealScaleFactor, scaleQuantitiesInText } from '$lib/nutrition/scaleMealIngredients';
import {
	ensureBreakfastMealForDay,
	loadBreakfastBackfillContextFromProfile,
	type BreakfastProfileInput
} from '$lib/server/nutrition/ensureBreakfastMeal';

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
	/** Complément féculent ajouté par le programme quand il ne fait pas partie de la recette (ex. riz complet). */
	complement: { name: string; grams: number } | null;
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

	const [profile, lastMeasure, nutritionDayInitial] = await Promise.all([
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
				breadType: true,
				intermittentFastingMorning: true
			}
		}),
		prisma.bodyMeasurement.findFirst({
			where: { userId },
			orderBy: { createdAt: 'desc' },
			select: { weightKg: true }
		}),
		prisma.nutritionDay.findUnique({
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
		})
	]);
	const weightKg = lastMeasure?.weightKg ?? null;
	let nutritionDay = nutritionDayInitial;

	const mealTargets = mealTargetsFromProfile(profile, weightKg);
	const breadKcal = profileBreadMacros(profile)?.kcal ?? 0;
	const targetKcal = mealTargets != null ? Math.round(mealTargets.kcal + breadKcal) : null;
	const mealBudgetKcal = mealTargets != null ? Math.round(mealTargets.kcal) : null;
	const round1 = (v: number) => Math.round(v * 10) / 10;
	const targetProteinG = mealTargets != null ? round1(mealTargets.proteinG) : null;
	const targetCarbsG = mealTargets != null ? round1(mealTargets.carbsG) : null;
	const targetFatG = mealTargets != null ? round1(mealTargets.fatG) : null;
	const targetFiberG = mealTargets != null ? round1(mealTargets.fiberG) : null;

	const dailyWaterLRest =
		weightKg != null && weightKg > 0
			? Math.round(dailyWaterLitersMin(weightKg, false) * 100) / 100
			: null;
	const dailyWaterLWorkout =
		weightKg != null && weightKg > 0
			? Math.round(dailyWaterLitersMin(weightKg, true) * 100) / 100
			: null;

	if (
		nutritionDay &&
		nutritionDay.meals.length > 0 &&
		!nutritionDay.meals.some((m) => m.position === 'BREAKFAST') &&
		profile
	) {
		const breakfastCtx = await loadBreakfastBackfillContextFromProfile(
			userId,
			profile as BreakfastProfileInput,
			weightKg
		);
		if (breakfastCtx) {
			await ensureBreakfastMealForDay(userId, dayIndex, nutritionDay.id, breakfastCtx);
			nutritionDay = await prisma.nutritionDay.findUnique({
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
		}
	}

	const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
	const dow = (dayIndex - 1) % 7;

	const weekNum = Math.min(13, Math.max(1, Math.ceil(dayIndex / 7)));

	const intermittentFasting =
		nutritionDay != null
			? nutritionDay.intermittentFasting
			: (profile?.intermittentFastingMorning ?? false);

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
			targetCarbsG,
			targetFatG,
			targetFiberG,
			dailyWaterLRest,
			dailyWaterLWorkout,
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
		// En jeûne, le petit-déj reste en BDD mais n'est ni affiché ni mangé : hors totaux.
		if (!(intermittentFasting && m.position === 'BREAKFAST')) {
			totC += macros.calories;
			totP += macros.proteinG;
			totCb += macros.carbsG;
			totF += macros.fatG;
			totFib += macros.fiberG;
		}

		const r = m.recipe;
		const refYield = r?.referenceYieldG ?? null;
		const factor = mealScaleFactor(m.quantityG, refYield);

		const ingredients: DayIngredientDTO[] =
			r?.ingredients.map((ing) => {
				const scaledG = mealIngredientGrams(ing, m, refYield);
				return {
					name: ing.name,
					quantityG: ing.quantityG,
					scaledG,
					unit: ing.unit,
					category: ing.category,
					isOptional: ing.isOptional,
					note: ing.note ? scaleQuantitiesInText(ing.note, factor) : null
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
			instructions: r?.instructions ? scaleQuantitiesInText(r.instructions, factor) : null,
			allergens: r?.allergens ?? [],
			ingredients,
			complement:
				m.extraStarchG != null &&
				m.extraStarchG > 0 &&
				m.extraStarchIngredientName &&
				!(r?.ingredients ?? []).some((ing) => ing.name === m.extraStarchIngredientName)
					? { name: m.extraStarchIngredientName, grams: m.extraStarchG }
					: null,
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
		targetCarbsG,
		targetFatG,
		targetFiberG,
		dailyWaterLRest,
		dailyWaterLWorkout,
		hasProfileForTargets: weightKg != null && weightKg > 0
	};
};
