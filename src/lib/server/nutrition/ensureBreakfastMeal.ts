import { prisma } from '$lib/server';
import { getCatalogRecipes } from './recipeCatalog';
import { regenerateShoppingListsOverlappingDays } from '$lib/prisma/shoppingList/regenerateOverlappingDay';
import type { MealMacroTargets } from '$lib/nutrition/nutritionTargets';
import { mealTargetsFromProfile } from './userMealTargets';
import type { MealPortion } from '$lib/nutrition/mealPortion';
import { fitDay } from '$lib/nutrition/dayPlanner';
import { refitDaysById } from './rescaleUserMeals';
import type { CatalogRecipe } from '$lib/server/program-generation/nutrition/planNutritionDays';
import { filterRecipesForUser } from '$lib/server/program-generation/nutrition/recipeFilterUtils';
import { catalogPickSeed, mulberry32 } from '$lib/server/program-generation/nutrition/seededRandom';

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
	mealTargets: MealMacroTargets | null;
};

type MealCreatePayload = {
	nutritionDayId: string;
	position: 'BREAKFAST';
	recipeId: string;
} & MealPortion;

function pickRandomFromPool<T>(items: T[], seed: number): T | null {
	if (items.length === 0) return null;
	const rng = mulberry32(seed);
	const idx = Math.floor(rng() * items.length);
	return items[idx] ?? null;
}

/** Contexte partagé — profil + poids déjà chargés, une seule requête recettes. */
export async function loadBreakfastBackfillContextFromProfile(
	userId: string,
	profile: BreakfastProfileInput,
	weightKg: number | null
): Promise<BreakfastBackfillContext | null> {
	const recipesRaw = (await getCatalogRecipes()).filter((r) => r.category === 'BREAKFAST');

	const breakfastRecipes = filterRecipesForUser(recipesRaw, profile);
	if (breakfastRecipes.length === 0) {
		return null;
	}

	return { breakfastRecipes, mealTargets: mealTargetsFromProfile(profile, weightKg) };
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

	return {
		nutritionDayId,
		position: 'BREAKFAST',
		recipeId: recipe.id,
		// Portion de départ sur la part du petit-déjeuner ; la journée est ensuite recalculée ensemble.
		...fitDay({ meals: [{ position: 'BREAKFAST', recipe }], daily: ctx.mealTargets, intermittentFasting: true })[0]
	};
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
	await refitDaysById(userId, payloads.map((p) => p.nutritionDayId));

	await regenerateShoppingListsOverlappingDays(
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
	await refitDaysById(userId, [nutritionDayId]);

	await regenerateShoppingListsOverlappingDays(userId, [dayIndex]);

	return true;
}
