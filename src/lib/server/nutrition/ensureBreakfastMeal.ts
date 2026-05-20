import { prisma } from '$lib/server';
import type { ActivityLevel, Prisma } from '@prisma/client';
import { upsertMeal } from '$lib/prisma/nutritionDay/upsertMeal';
import {
	dailyProteinTargetG,
	targetCaloriesPerDay
} from '$lib/nutrition/nutritionTargets';
import { breadMacrosForGrams, type BreadTypeValue } from '$lib/schema/profile/breadType';
import { cadencierJeuneLog } from '$lib/server/cadencierJeuneLog';

const DEFAULT_REFERENCE_G = 100;
const SCALE_MIN = 0.15;
const SCALE_MAX = 2.5;
const BREAKFAST_FRAC = 0.3;

const recipeCatalogSelect = {
	id: true,
	category: true,
	referenceYieldG: true,
	nutritionKcal: true,
	nutritionProteinG: true,
	nutritionCarbsG: true,
	nutritionFatG: true,
	nutritionFiberG: true,
	allergens: true,
	name: true,
	ingredients: { select: { name: true } }
} as unknown as Prisma.RecipeSelect;

type CatalogRecipe = {
	id: string;
	referenceYieldG: number | null;
	nutritionKcal: number | null;
	nutritionProteinG: number | null;
	nutritionCarbsG: number | null;
	nutritionFatG: number | null;
	nutritionFiberG: number | null;
	allergens: string[];
	ingredients: { name: string }[];
	name: string;
};

function normalize(str: string): string {
	return str
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');
}

function parseTextTerms(text: string | null | undefined): string[] {
	if (!text) return [];
	return text
		.split(/[,;\n]+/)
		.map((t) => normalize(t.trim()))
		.filter((t) => t.length > 0);
}

function recipeConflictsUser(
	recipe: CatalogRecipe,
	userAllergens: string[],
	freeTerms: string[]
): boolean {
	const avoid = new Set(userAllergens);
	if (recipe.allergens.some((a) => avoid.has(a))) return true;
	if (freeTerms.length === 0) return false;
	const recipeName = normalize(recipe.name);
	const ingredientNames = recipe.ingredients.map((i) => normalize(i.name));
	return freeTerms.some(
		(term) =>
			recipeName.includes(term) ||
			ingredientNames.some((ing) => ing.includes(term))
	);
}

function mealQuantityG(recipe: CatalogRecipe): number {
	if (recipe.referenceYieldG != null && recipe.referenceYieldG > 0) {
		return recipe.referenceYieldG;
	}
	return DEFAULT_REFERENCE_G;
}

function scaledMacrosForQuantity(recipe: CatalogRecipe, quantityG: number) {
	const refG =
		recipe.referenceYieldG != null && recipe.referenceYieldG > 0
			? recipe.referenceYieldG
			: DEFAULT_REFERENCE_G;
	const factor = quantityG / refG;
	return {
		calcCalories: recipe.nutritionKcal != null ? recipe.nutritionKcal * factor : null,
		calcProteinG: recipe.nutritionProteinG != null ? recipe.nutritionProteinG * factor : null,
		calcCarbsG: recipe.nutritionCarbsG != null ? recipe.nutritionCarbsG * factor : null,
		calcFatG: recipe.nutritionFatG != null ? recipe.nutritionFatG * factor : null,
		calcFiberG: recipe.nutritionFiberG != null ? recipe.nutritionFiberG * factor : null
	};
}

function catalogPickSeed(userId: string, dayIndex: number, position: string, slotIndex: number): number {
	const s = `${userId}\0${dayIndex}\0${position}\0${slotIndex}`;
	let h = 2166136261 >>> 0;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619) >>> 0;
	}
	return h >>> 0;
}

function mulberry32(initial: number): () => number {
	let a = initial >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function pickRandomFromPool<T>(items: T[], seed: number): T | null {
	if (items.length === 0) return null;
	const rng = mulberry32(seed);
	const idx = Math.floor(rng() * items.length);
	return items[idx] ?? null;
}

function clampScale(scale: number): number {
	return Math.min(SCALE_MAX, Math.max(SCALE_MIN, scale));
}

/**
 * Crée un repas BREAKFAST manquant (ex. utilisateur jeûne → repas non générés à l'origine).
 * Retourne true si un repas a été créé.
 */
export async function ensureBreakfastMealForDay(
	userId: string,
	dayIndex: number,
	nutritionDayId: string
): Promise<boolean> {
	const existing = await prisma.meal.findFirst({
		where: { nutritionDayId, position: 'BREAKFAST' },
		select: { id: true }
	});
	if (existing) return false;

	const profile = await prisma.userProfile.findUnique({
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
	});

	const userAllergens = profile?.allergens ?? [];
	const freeTerms = [
		...parseTextTerms(profile?.otherAllergens),
		...parseTextTerms(profile?.disgustingFoods)
	];

	const recipesRaw = (await prisma.recipe.findMany({
		where: { isCustom: false, active: true, category: 'BREAKFAST' },
		select: recipeCatalogSelect
	})) as unknown as CatalogRecipe[];

	const breakfastRecipes = recipesRaw.filter(
		(r) => !recipeConflictsUser(r, userAllergens, freeTerms)
	);

	if (breakfastRecipes.length === 0) {
		cadencierJeuneLog('ensureBreakfast:skip', {
			userId,
			dayIndex,
			reason: 'no_eligible_breakfast_recipes'
		});
		return false;
	}

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

	const targetProteinG =
		weightKg != null &&
		weightKg > 0 &&
		profile?.bodyFatPercent != null &&
		profile.bodyFatPercent >= 3 &&
		profile.bodyFatPercent <= 70
			? dailyProteinTargetG(weightKg, profile.bodyFatPercent)
			: null;

	const mealBudget = targetKcal != null ? Math.max(targetKcal - breadKcal, 0) : 0;

	const seed = catalogPickSeed(userId, dayIndex, 'BREAKFAST', 0);
	const recipe = pickRandomFromPool(breakfastRecipes, seed);
	if (!recipe) return false;

	const baseQ = mealQuantityG(recipe);
	const baseKcal = scaledMacrosForQuantity(recipe, baseQ).calcCalories ?? 0;
	const baseProtein = scaledMacrosForQuantity(recipe, baseQ).calcProteinG ?? 0;

	let calorieScale = Number.POSITIVE_INFINITY;
	let proteinScale = Number.POSITIVE_INFINITY;
	if (targetKcal != null && mealBudget > 0 && baseKcal > 0) {
		calorieScale = (mealBudget * BREAKFAST_FRAC) / baseKcal;
	}
	if (targetProteinG != null && targetProteinG > 0 && baseProtein > 0) {
		proteinScale = (targetProteinG * BREAKFAST_FRAC) / baseProtein;
	}

	const finiteScales = [calorieScale, proteinScale].filter(Number.isFinite);
	const scale = clampScale(finiteScales.length > 0 ? Math.min(...finiteScales) : 1);
	const quantityG = baseQ * scale;
	const macros = scaledMacrosForQuantity(recipe, quantityG);

	await upsertMeal({
		nutritionDayId,
		position: 'BREAKFAST',
		recipeId: recipe.id,
		quantityG,
		...macros
	});

	cadencierJeuneLog('ensureBreakfast:created', {
		userId,
		dayIndex,
		recipeId: recipe.id,
		recipeName: recipe.name,
		quantityG: Math.round(quantityG * 10) / 10
	});

	return true;
}
