import { prisma } from '$lib/server';
import type { Prisma } from '@prisma/client';
import { generateShoppingListFromPlanning } from '$lib/prisma/shoppingList/generateFromPlanning';
import {
	dailyProteinTargetG,
	targetCaloriesPerDay
} from '$lib/nutrition/nutritionTargets';
import { breadMacrosForGrams, type BreadTypeValue } from '$lib/schema/profile/breadType';

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

export type BreakfastProfileInput = {
	allergens: string[];
	otherAllergens: string | null;
	disgustingFoods: string | null;
	bodyFatPercent: number | null;
	activityLevel: string | null;
	breadDaily: boolean;
	breadGramsPerDay: number | null;
	breadType: string | null;
};

export type BreakfastBackfillContext = {
	breakfastRecipes: CatalogRecipe[];
	mealBudget: number;
	targetProteinG: number | null;
};

type MealCreatePayload = {
	nutritionDayId: string;
	position: 'BREAKFAST';
	recipeId: string;
	quantityG: number;
	calcCalories: number | null;
	calcProteinG: number | null;
	calcCarbsG: number | null;
	calcFatG: number | null;
	calcFiberG: number | null;
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

function filterBreakfastRecipes(profile: BreakfastProfileInput, recipesRaw: CatalogRecipe[]): CatalogRecipe[] {
	const userAllergens = profile.allergens ?? [];
	const freeTerms = [
		...parseTextTerms(profile.otherAllergens),
		...parseTextTerms(profile.disgustingFoods)
	];
	return recipesRaw.filter((r) => !recipeConflictsUser(r, userAllergens, freeTerms));
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

function computeMealBudget(profile: BreakfastProfileInput, weightKg: number | null): {
	mealBudget: number;
	targetProteinG: number | null;
} {
	let breadKcal = 0;
	if (
		profile.breadDaily &&
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
					bodyFatPercent: profile.bodyFatPercent,
					activityLevel: profile.activityLevel as import('@prisma/client').ActivityLevel | null
				})
			: null;

	const targetProteinG =
		weightKg != null &&
		weightKg > 0 &&
		profile.bodyFatPercent != null &&
		profile.bodyFatPercent >= 3 &&
		profile.bodyFatPercent <= 70
			? dailyProteinTargetG(weightKg, profile.bodyFatPercent)
			: null;

	return {
		mealBudget: targetKcal != null ? Math.max(targetKcal - breadKcal, 0) : 0,
		targetProteinG
	};
}

/** Contexte partagé — profil + poids déjà chargés, une seule requête recettes. */
export async function loadBreakfastBackfillContextFromProfile(
	userId: string,
	profile: BreakfastProfileInput,
	weightKg: number | null
): Promise<BreakfastBackfillContext | null> {
	const recipesRaw = (await prisma.recipe.findMany({
		where: { isCustom: false, active: true, category: 'BREAKFAST' },
		select: recipeCatalogSelect
	})) as unknown as CatalogRecipe[];

	const breakfastRecipes = filterBreakfastRecipes(profile, recipesRaw);
	if (breakfastRecipes.length === 0) {
		return null;
	}

	const { mealBudget, targetProteinG } = computeMealBudget(profile, weightKg);
	return { breakfastRecipes, mealBudget, targetProteinG };
}

/** Charge profil + poids + recettes en parallèle (toggle, appels isolés). */
export async function loadBreakfastBackfillContext(userId: string): Promise<BreakfastBackfillContext | null> {
	const [profile, lastMeasure] = await Promise.all([
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

	if (!profile) return null;
	return loadBreakfastBackfillContextFromProfile(userId, profile as BreakfastProfileInput, lastMeasure?.weightKg ?? null);
}

function buildBreakfastMealPayload(
	userId: string,
	dayIndex: number,
	nutritionDayId: string,
	ctx: BreakfastBackfillContext
): MealCreatePayload | null {
	const seed = catalogPickSeed(userId, dayIndex, 'BREAKFAST', 0);
	const recipe = pickRandomFromPool(ctx.breakfastRecipes, seed);
	if (!recipe) return null;

	const baseQ = mealQuantityG(recipe);
	const baseKcal = scaledMacrosForQuantity(recipe, baseQ).calcCalories ?? 0;
	const baseProtein = scaledMacrosForQuantity(recipe, baseQ).calcProteinG ?? 0;

	let calorieScale = Number.POSITIVE_INFINITY;
	let proteinScale = Number.POSITIVE_INFINITY;
	if (ctx.mealBudget > 0 && baseKcal > 0) {
		calorieScale = (ctx.mealBudget * BREAKFAST_FRAC) / baseKcal;
	}
	if (ctx.targetProteinG != null && ctx.targetProteinG > 0 && baseProtein > 0) {
		proteinScale = (ctx.targetProteinG * BREAKFAST_FRAC) / baseProtein;
	}

	const finiteScales = [calorieScale, proteinScale].filter(Number.isFinite);
	const scale = clampScale(finiteScales.length > 0 ? Math.min(...finiteScales) : 1);
	const quantityG = baseQ * scale;

	return {
		nutritionDayId,
		position: 'BREAKFAST',
		recipeId: recipe.id,
		quantityG,
		...scaledMacrosForQuantity(recipe, quantityG)
	};
}

async function regenerateShoppingListsForDayIndices(
	userId: string,
	dayIndices: number[]
): Promise<void> {
	if (dayIndices.length === 0) return;

	const lists = await prisma.shoppingList.findMany({
		where: {
			userId,
			OR: dayIndices.map((dayIndex) => ({
				startDayIndex: { lte: dayIndex },
				endDayIndex: { gte: dayIndex }
			}))
		},
		select: { startDayIndex: true, endDayIndex: true }
	});

	const seen = new Set<string>();
	for (const { startDayIndex, endDayIndex } of lists) {
		const key = `${startDayIndex}-${endDayIndex}`;
		if (seen.has(key)) continue;
		seen.add(key);
		await generateShoppingListFromPlanning(userId, startDayIndex, endDayIndex, {
			includeReportedFromPrevious: true
		});
	}
}

type DayForBackfill = {
	id: string;
	dayIndex: number;
	meals: { position: string }[];
};

/**
 * Crée les BREAKFAST manquants en batch (1 contexte, createMany, 1 regen courses max par période).
 */
export async function backfillMissingBreakfastMeals(
	userId: string,
	days: DayForBackfill[],
	ctx: BreakfastBackfillContext
): Promise<boolean> {
	const needs = days.filter(
		(d) => d.meals.length > 0 && !d.meals.some((m) => m.position === 'BREAKFAST')
	);
	if (needs.length === 0) return false;

	const payloads: MealCreatePayload[] = [];
	for (const day of needs) {
		const payload = buildBreakfastMealPayload(userId, day.dayIndex, day.id, ctx);
		if (payload) payloads.push(payload);
	}
	if (payloads.length === 0) return false;

	await prisma.meal.createMany({ data: payloads });

	await regenerateShoppingListsForDayIndices(
		userId,
		needs.map((d) => d.dayIndex)
	);

	return true;
}

/** Crée un BREAKFAST pour un seul jour (toggle jeûne off). */
export async function ensureBreakfastMealForDay(
	userId: string,
	dayIndex: number,
	nutritionDayId: string,
	ctx?: BreakfastBackfillContext
): Promise<boolean> {
	const existing = await prisma.meal.findFirst({
		where: { nutritionDayId, position: 'BREAKFAST' },
		select: { id: true }
	});
	if (existing) return false;

	const context = ctx ?? (await loadBreakfastBackfillContext(userId));
	if (!context) return false;

	const payload = buildBreakfastMealPayload(userId, dayIndex, nutritionDayId, context);
	if (!payload) return false;

	await prisma.meal.create({ data: payload });

	await regenerateShoppingListsForDayIndices(userId, [dayIndex]);

	return true;
}
