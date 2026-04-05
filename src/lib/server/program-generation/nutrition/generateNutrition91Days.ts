import { prisma } from '$lib/server';
import type { MealPosition, RecipeCategory } from '@prisma/client';

/** Aligné sur Program.totalDays (91 jours). */
export const PROGRAM_NUTRITION_DAYS = 91;

const DEFAULT_REFERENCE_G = 100;

type CatalogRecipe = {
	id: string;
	category: RecipeCategory;
	referenceYieldG: number | null;
	nutritionKcal: number | null;
	nutritionProteinG: number | null;
	nutritionCarbsG: number | null;
	nutritionFatG: number | null;
};

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
		calcFatG: recipe.nutritionFatG != null ? recipe.nutritionFatG * factor : null
	};
}

function pickRotating<T>(items: T[], index: number): T | null {
	if (items.length === 0) return null;
	return items[index % items.length] ?? null;
}

/**
 * Génère les 91 journées nutrition (NutritionDay + Meal) à partir du catalogue admin.
 * Placeholder algorithmique : rotation des recettes par catégorie ; à remplacer par la distribution ciblée macros/profil.
 */
export async function generateNutrition91Days(userId: string): Promise<void> {
	const profile = await prisma.userProfile.findUnique({
		where: { userId },
		select: { breakfastEnabled: true, intermittentFastingMorning: true }
	});
	const breakfastEnabled = profile?.breakfastEnabled ?? false;
	const intermittentFastingDefault = profile?.intermittentFastingMorning === true;

	const recipes = await prisma.recipe.findMany({
		where: { isCustom: false, active: true },
		select: {
			id: true,
			category: true,
			referenceYieldG: true,
			nutritionKcal: true,
			nutritionProteinG: true,
			nutritionCarbsG: true,
			nutritionFatG: true
		}
	});

	const breakfastRecipes = recipes.filter((r) => r.category === 'BREAKFAST');
	const mealRecipes = recipes.filter((r) => r.category === 'MEAL');
	const fallbackPool = mealRecipes.length > 0 ? mealRecipes : recipes;

	if (fallbackPool.length === 0) {
		console.warn(
			`[program-generation] Aucune recette catalogue active pour userId=${userId} — nutrition 91j ignorée.`
		);
		return;
	}

	const breakfastPool = breakfastRecipes.length > 0 ? breakfastRecipes : fallbackPool;

	const positions: MealPosition[] = breakfastEnabled
		? ['BREAKFAST', 'LUNCH', 'DINNER']
		: ['LUNCH', 'DINNER'];

	for (let dayIndex = 1; dayIndex <= PROGRAM_NUTRITION_DAYS; dayIndex++) {
		let nutritionDay = await prisma.nutritionDay.findUnique({
			where: { userId_dayIndex: { userId, dayIndex } }
		});
		if (!nutritionDay) {
			nutritionDay = await prisma.nutritionDay.create({
				data: {
					userId,
					dayIndex,
					intermittentFasting: intermittentFastingDefault
				}
			});
		}

		const existingMeals = await prisma.meal.findMany({
			where: { nutritionDayId: nutritionDay.id },
			select: { position: true }
		});
		const hasPosition = new Set(existingMeals.map((m) => m.position));

		for (let slot = 0; slot < positions.length; slot++) {
			const position = positions[slot];
			if (hasPosition.has(position)) continue;

			const pool =
				position === 'BREAKFAST' ? breakfastPool : mealRecipes.length > 0 ? mealRecipes : fallbackPool;
			const recipe = pickRotating(pool, dayIndex + slot * 997);
			if (!recipe) continue;

			const quantityG = mealQuantityG(recipe);
			const macros = scaledMacrosForQuantity(recipe, quantityG);

			await prisma.meal.create({
				data: {
					nutritionDayId: nutritionDay.id,
					position,
					recipeId: recipe.id,
					quantityG,
					...macros
				}
			});
		}
	}
}
