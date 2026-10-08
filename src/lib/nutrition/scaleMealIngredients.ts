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

/**
 * Met à l'échelle les grammages et nombres d'œufs cités dans une note ou des instructions
 * (« 50g plat + 200g dessert » × 0,8 → « 40 g plat + 160 g dessert » ; « 3 œufs » × 1,42 → « 4 œufs »).
 */
export function scaleQuantitiesInText(text: string, factor: number): string {
	if (!Number.isFinite(factor) || factor === 1) return text;
	return text
		.replace(/(\d+(?:[.,]\d+)?)\s?g\b/gi, (_, n: string) => {
			const v = Number.parseFloat(n.replace(',', '.')) * factor;
			return `${Math.round(v)} g`;
		})
		.replace(/(\d+)(\s+)(œuf|oeuf)s?/gi, (_, n: string, space: string, word: string) => {
			const count = Math.max(1, Math.round(Number.parseInt(n, 10) * factor));
			return `${count}${space}${word}${count > 1 ? 's' : ''}`;
		});
}

/** Accorde un mot simple au nombre (« banane » / « bananes »). */
function inflect(word: string, count: number): string {
	if (count > 1) return /[sx]$/i.test(word) ? word : `${word}s`;
	return word.length > 3 && /s$/i.test(word) ? word.slice(0, -1) : word;
}

/**
 * Note d'ingrédient mise à l'échelle : grammages, œufs, et nombre d'unités en tête de note
 * (« 2 bananes - dessert » × 0,5 → « 1 banane - dessert », « 4 tranches » × 1,5 → « 6 tranches »).
 */
export function scaleIngredientNote(note: string, factor: number): string {
	const scaled = scaleQuantitiesInText(note, factor);
	if (!Number.isFinite(factor) || factor === 1) return scaled;
	return scaled.replace(/^(\s*)(\d+)(\s+)([a-zà-ÿ]+)/i, (match, lead: string, n: string, space: string, word: string) => {
		if (/^(œuf|oeuf|g)$/i.test(word.replace(/s$/i, ''))) return match;
		const count = Math.max(1, Math.round(Number.parseInt(n, 10) * factor));
		return `${lead}${count}${space}${inflect(word, count)}`;
	});
}
