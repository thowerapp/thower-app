import type { MealPosition, Prisma, RecipeCategory } from '@prisma/client';
import { fitDay, pickDayRecipes } from '$lib/nutrition/dayPlanner';
import type { MealPortion } from '$lib/nutrition/mealPortion';
import type { MealMacroTargets } from '$lib/nutrition/nutritionTargets';
import { fitRecipeSelect, fixedDayMacros, isAdjustableMeal } from '$lib/server/nutrition/rescaleUserMeals';

/** Jours précédents dont les recettes ne sont pas reprises. */
export const RECENT_DAYS = 3;

export type CatalogRecipe = {
	id: string;
	category: RecipeCategory;
	referenceYieldG: number | null;
	nutritionKcal: number | null;
	nutritionProteinG: number | null;
	nutritionCarbsG: number | null;
	nutritionFatG: number | null;
	nutritionFiberG: number | null;
	allergens: string[];
	ingredients: { name: string; quantityG: number | null; category: string | null }[];
	name: string;
};

type ExistingMeal = Prisma.MealGetPayload<{ include: { recipe: { select: typeof fitRecipeSelect } } }>;

export type ExistingNutritionDay = {
	id: string;
	dayIndex: number;
	intermittentFasting: boolean;
	meals: ExistingMeal[];
};

export type NutritionDayPlan = {
	daysToCreate: { dayIndex: number; intermittentFasting: boolean }[];
	mealUpdates: { mealId: string; portion: MealPortion }[];
	mealCreates: { dayIndex: number; position: MealPosition; recipeId: string; portion: MealPortion }[];
	daysTouched: number;
	/** Jours échantillonnés pour les logs. */
	samples: { dayIndex: number; positions: MealPosition[]; recipeIds: string[]; scales: number[] }[];
};

/** Graine déterministe (FNV-1a) pour tirage pseudo-aléatoire stable par user / jour / créneau. */
export function catalogPickSeed(userId: string, dayIndex: number, position: string, slotIndex: number): number {
	const s = `${userId}\0${dayIndex}\0${position}\0${slotIndex}`;
	let h = 2166136261 >>> 0;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619) >>> 0;
	}
	return h >>> 0;
}

/** Mulberry32 → [0, 1). */
export function mulberry32(initial: number): () => number {
	let a = initial >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Calcule en mémoire les écritures nécessaires pour compléter les jours 1..targetDays (aucun accès base).
 * Les repas existants ajustables sont recalculés avec les repas créés ; ceux mangés ou saisis à la main sont conservés.
 */
export function planNutritionDays(args: {
	userId: string;
	targetDays: number;
	existingDays: ExistingNutritionDay[];
	positions: MealPosition[];
	intermittentFastingDefault: boolean;
	mealTargets: MealMacroTargets | null;
	pools: { BREAKFAST: CatalogRecipe[]; MEAL: CatalogRecipe[] };
}): NutritionDayPlan {
	const { userId, targetDays, positions, intermittentFastingDefault, mealTargets, pools } = args;
	const byIndex = new Map(args.existingDays.map((d) => [d.dayIndex, d]));
	const plan: NutritionDayPlan = {
		daysToCreate: [],
		mealUpdates: [],
		mealCreates: [],
		daysTouched: 0,
		samples: []
	};
	let recentDays: string[][] = [];

	for (let dayIndex = 1; dayIndex <= targetDays; dayIndex++) {
		let day = byIndex.get(dayIndex);
		if (!day) {
			plan.daysToCreate.push({ dayIndex, intermittentFasting: intermittentFastingDefault });
			day = { id: '', dayIndex, intermittentFasting: intermittentFastingDefault, meals: [] };
		}

		const existingMeals = day.meals;
		const hasPosition = new Set(existingMeals.map((m) => m.position));
		const missing = positions.filter((p) => !hasPosition.has(p));

		// Recettes des 3 derniers jours : pas reprises (variété).
		const recentRecipeIds = new Set(recentDays.flat());
		if (missing.length === 0) {
			recentDays = [
				...recentDays.slice(-(RECENT_DAYS - 1)),
				existingMeals.map((m) => m.recipeId).filter((id): id is string => !!id)
			];
			continue;
		}

		plan.daysTouched++;

		const fasting = day.intermittentFasting;
		const kept = existingMeals.filter(isAdjustableMeal);
		const fixed = fixedDayMacros(existingMeals, fasting);
		const picks = pickDayRecipes({
			positionsToFill: missing,
			existing: kept.map((m) => ({ position: m.position, recipe: m.recipe!, recipeId: m.recipeId })),
			pools,
			daily: mealTargets,
			intermittentFasting: fasting,
			fixed,
			recentRecipeIds,
			random: mulberry32(catalogPickSeed(userId, dayIndex, 'DAY', 0))
		});

		// Journée entière ajustée ensemble : repas existants ajustables + repas créés.
		const planned = [
			...kept.map((m) => ({ mealId: m.id as string | null, position: m.position, recipeId: m.recipeId!, recipe: m.recipe! })),
			...[...picks].map(([position, recipe]) => ({
				mealId: null,
				position: position as MealPosition,
				recipeId: recipe.id,
				recipe
			}))
		];
		const portions = fitDay({ meals: planned, daily: mealTargets, intermittentFasting: fasting, fixed });

		const scales: number[] = [];
		for (const [k, meal] of planned.entries()) {
			const portion = portions[k];
			scales.push(Math.round((portion.quantityG / (meal.recipe.referenceYieldG || 100)) * 1000) / 1000);
			if (meal.mealId) plan.mealUpdates.push({ mealId: meal.mealId, portion });
			else plan.mealCreates.push({ dayIndex, position: meal.position, recipeId: meal.recipeId, portion });
		}
		recentDays = [
			...recentDays.slice(-(RECENT_DAYS - 1)),
			[...existingMeals.map((m) => m.recipeId), ...planned.map((m) => m.recipeId)].filter(
				(id): id is string => !!id
			)
		];

		if (dayIndex === 1 || dayIndex === targetDays || dayIndex % 30 === 0) {
			plan.samples.push({
				dayIndex,
				positions: [...picks.keys()] as MealPosition[],
				recipeIds: [...picks.values()].map((r) => r.id),
				scales
			});
		}
	}

	return plan;
}
