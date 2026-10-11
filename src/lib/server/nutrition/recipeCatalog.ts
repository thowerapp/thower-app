import { prisma } from '$lib/server';
import { createTtlCache } from '$lib/server/cache/ttlCache';
import type { CatalogRecipe } from '$lib/server/program-generation/nutrition/planNutritionDays';

export type CatalogRecipeRow = CatalogRecipe & { totalTimeMin: number | null };

const cache = createTtlCache(60_000);

/** Recettes actives du catalogue admin (ingrédients inclus), identiques pour tous : lecture partagée et en lecture seule. */
export function getCatalogRecipes(): Promise<CatalogRecipeRow[]> {
	return cache.get(
		() =>
			prisma.recipe.findMany({
				where: { isCustom: false, active: true },
				select: {
					id: true,
					name: true,
					category: true,
					totalTimeMin: true,
					referenceYieldG: true,
					nutritionKcal: true,
					nutritionProteinG: true,
					nutritionCarbsG: true,
					nutritionFatG: true,
					nutritionFiberG: true,
					allergens: true,
					ingredients: { select: { name: true, quantityG: true, category: true }, orderBy: { order: 'asc' } }
				},
				orderBy: { name: 'asc' }
			}) as Promise<CatalogRecipeRow[]>
	);
}

/** À appeler après toute écriture sur une recette ou ses ingrédients. */
export const invalidateRecipeCatalog = cache.invalidate;
