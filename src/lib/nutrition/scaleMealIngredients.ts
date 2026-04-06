/** Aligné sur la liste de courses : (meal.quantityG / ref) × ingrédient. */
export const DEFAULT_REFERENCE_YIELD_G = 100;

export function recipeReferenceYieldG(referenceYieldG: number | null | undefined): number {
	if (referenceYieldG != null && referenceYieldG > 0) return referenceYieldG;
	return DEFAULT_REFERENCE_YIELD_G;
}

/** Facteur par rapport à la fiche recette (portion planifiée). */
export function mealScaleFactor(
	mealQuantityG: number | null | undefined,
	referenceYieldG: number | null | undefined
): number {
	const refG = recipeReferenceYieldG(referenceYieldG);
	const mq = mealQuantityG != null && mealQuantityG > 0 ? mealQuantityG : refG;
	return mq / refG;
}

/** Grammes ingrédient pour la quantité de plat planifiée ; null si non mesurable. */
export function scaledIngredientGrams(
	ingredientQuantityG: number | null | undefined,
	mealQuantityG: number | null | undefined,
	referenceYieldG: number | null | undefined
): number | null {
	if (ingredientQuantityG == null || Number.isNaN(ingredientQuantityG)) return null;
	return ingredientQuantityG * mealScaleFactor(mealQuantityG, referenceYieldG);
}
