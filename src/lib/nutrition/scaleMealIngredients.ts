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

/** Grammes ingrédient du repas : portion de recette + féculent ajouté par computeMealPortion si c'est cet ingrédient. */
export function mealIngredientGrams(
	ingredient: { name: string; quantityG: number | null | undefined },
	meal: {
		quantityG: number | null | undefined;
		extraStarchG?: number | null;
		extraStarchIngredientName?: string | null;
	},
	referenceYieldG: number | null | undefined
): number | null {
	const scaled = scaledIngredientGrams(ingredient.quantityG, meal.quantityG, referenceYieldG);
	if (scaled == null) return null;
	const extra =
		meal.extraStarchG != null && meal.extraStarchG > 0 && meal.extraStarchIngredientName === ingredient.name
			? meal.extraStarchG
			: 0;
	return scaled + extra;
}

/** Met à l'échelle les grammages cités dans une note (« 50g plat + 200g dessert » × 0,8 → « 40 g plat + 160 g dessert »). */
export function scaleGramsInNote(note: string, factor: number): string {
	if (!Number.isFinite(factor) || factor === 1) return note;
	return note.replace(/(\d+(?:[.,]\d+)?)\s?g\b/gi, (_, n: string) => {
		const v = Number.parseFloat(n.replace(',', '.')) * factor;
		return `${Math.round(v)} g`;
	});
}
