import { normalizeIngredientName } from './normalizeIngredientName';
import { recipeReferenceYieldG } from './scaleMealIngredients';

/**
 * Calcul unique des portions de repas (génération, recalage, changement de recette, jeûne).
 *
 * Les recettes du catalogue sont très protéinées (~6,8 g P / 100 kcal contre ~4,7 visé) : un facteur
 * unique ne peut pas atteindre à la fois la cible kcal et la cible protéines. Méthode :
 *  1. facteur recette = min(cible protéines, cible kcal) → protéines atteintes sans dépasser les kcal ;
 *  2. le solde kcal est comblé avec le féculent de la recette (grammes crus ajoutés ; féculent total
 *     plafonné à 150 g cru, 400 g pour pommes de terre / patates douces) ;
 *  3. s'il reste un solde (pas de féculent ou plafond atteint), on remonte le facteur recette.
 * Les kcal sont toujours recalculées depuis les macros (Atwater) : 4 P + 4 G + 9 L + 2 fibres.
 */

export const SCALE_MIN = 0.15;
export const SCALE_MAX = 2.5;
/** Féculent total au maximum sur un repas (portion recette + ajout), en grammes crus. */
export const MAX_STARCH_G_DRY = 150;
/** Idem pour les féculents frais peu denses (pommes de terre, patates douces). */
export const MAX_STARCH_G_FRESH = 400;

export type MacroValues = {
	proteinG: number;
	carbsG: number;
	fatG: number;
	fiberG: number;
};

export type MealMacros = {
	calcCalories: number | null;
	calcProteinG: number | null;
	calcCarbsG: number | null;
	calcFatG: number | null;
	calcFiberG: number | null;
};

export type PortionRecipe = {
	referenceYieldG: number | null;
	nutritionProteinG: number | null;
	nutritionCarbsG: number | null;
	nutritionFatG: number | null;
	nutritionFiberG: number | null;
	ingredients?: { name: string; quantityG: number | null; category?: string | null }[];
};

export type MealPortion = {
	quantityG: number;
	extraStarchG: number | null;
	extraStarchIngredientName: string | null;
} & MealMacros;

/**
 * Féculents de référence — valeurs Ciqual pour 100 g cru (glucides hors fibres).
 * Chaque mot-clé doit préfixer un mot du libellé ; ordre = priorité de correspondance.
 */
const STARCH_REFERENCE: { tokens: string[]; per100: MacroValues }[] = [
	{ tokens: ['nouilles', 'riz'], per100: { proteinG: 6, carbsG: 80, fatG: 0.7, fiberG: 2 } },
	{ tokens: ['riz', 'complet'], per100: { proteinG: 7.5, carbsG: 74, fatG: 2.5, fiberG: 3.5 } },
	{ tokens: ['riz', 'sauvage'], per100: { proteinG: 7.5, carbsG: 74, fatG: 2.5, fiberG: 3.5 } },
	{ tokens: ['riz'], per100: { proteinG: 7.5, carbsG: 78, fatG: 0.6, fiberG: 1.4 } },
	{ tokens: ['pates', 'complet'], per100: { proteinG: 13, carbsG: 64, fatG: 2.2, fiberG: 7.9 } },
	{ tokens: ['penne', 'complet'], per100: { proteinG: 13, carbsG: 64, fatG: 2.2, fiberG: 7.9 } },
	{ tokens: ['pates'], per100: { proteinG: 12.5, carbsG: 71, fatG: 1.5, fiberG: 3 } },
	{ tokens: ['quinoa'], per100: { proteinG: 14, carbsG: 64, fatG: 6, fiberG: 7 } },
	{ tokens: ['boulgour'], per100: { proteinG: 12, carbsG: 69, fatG: 1.3, fiberG: 8 } },
	{ tokens: ['semoule'], per100: { proteinG: 12.5, carbsG: 68, fatG: 2, fiberG: 6 } },
	{ tokens: ['patate', 'douce'], per100: { proteinG: 1.6, carbsG: 20, fatG: 0.1, fiberG: 3 } },
	{ tokens: ['pomme', 'terre'], per100: { proteinG: 2, carbsG: 17, fatG: 0.1, fiberG: 1.6 } },
	{ tokens: ['avoine'], per100: { proteinG: 13.5, carbsG: 58.7, fatG: 7, fiberG: 10 } },
	{ tokens: ['pain', 'seigle'], per100: { proteinG: 7, carbsG: 42, fatG: 1.5, fiberG: 8 } },
	{ tokens: ['pain', 'mie'], per100: { proteinG: 9, carbsG: 43, fatG: 4, fiberG: 6 } }
];

/** kcal Atwater — glucides hors fibres, fibres à 2 kcal/g. */
export function atwaterKcal(m: MacroValues): number {
	return 4 * m.proteinG + 4 * m.carbsG + 9 * m.fatG + 2 * m.fiberG;
}

function clampScale(scale: number): number {
	return Math.min(SCALE_MAX, Math.max(SCALE_MIN, scale));
}

function addMacros(a: MacroValues, b: MacroValues, factorB: number): MacroValues {
	return {
		proteinG: a.proteinG + b.proteinG * factorB,
		carbsG: a.carbsG + b.carbsG * factorB,
		fatG: a.fatG + b.fatG * factorB,
		fiberG: a.fiberG + b.fiberG * factorB
	};
}

const ZERO: MacroValues = { proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 };

function recipeHasMacros(recipe: Omit<PortionRecipe, 'ingredients'>): boolean {
	return (
		recipe.nutritionProteinG != null ||
		recipe.nutritionCarbsG != null ||
		recipe.nutritionFatG != null ||
		recipe.nutritionFiberG != null
	);
}

/** Macros de la fiche pour la portion de référence (referenceYieldG). */
export function recipeBaseMacros(recipe: Omit<PortionRecipe, 'ingredients'>): MacroValues {
	return {
		proteinG: recipe.nutritionProteinG ?? 0,
		carbsG: recipe.nutritionCarbsG ?? 0,
		fatG: recipe.nutritionFatG ?? 0,
		fiberG: recipe.nutritionFiberG ?? 0
	};
}

/** Valeurs pour 100 g cru du féculent correspondant au libellé, ou null. */
export function starchReferenceFor(ingredientName: string): MacroValues | null {
	const words = normalizeIngredientName(ingredientName).split(/[^a-z]+/);
	const ref = STARCH_REFERENCE.find((s) => s.tokens.every((t) => words.some((w) => w.startsWith(t))));
	return ref?.per100 ?? null;
}

/** Premier ingrédient pesé de la recette reconnu comme féculent (catégorie « Féculents » si renseignée). */
export function findStarchIngredient(
	recipe: PortionRecipe
): { name: string; quantityG: number; per100: MacroValues } | null {
	for (const ing of recipe.ingredients ?? []) {
		if (ing.quantityG == null || ing.quantityG <= 0) continue;
		if (ing.category && !normalizeIngredientName(ing.category).startsWith('feculent')) continue;
		const per100 = starchReferenceFor(ing.name);
		if (per100) return { name: ing.name, quantityG: ing.quantityG, per100 };
	}
	return null;
}

function toMealMacros(m: MacroValues): MealMacros {
	return {
		calcCalories: atwaterKcal(m),
		calcProteinG: m.proteinG,
		calcCarbsG: m.carbsG,
		calcFatG: m.fatG,
		calcFiberG: m.fiberG
	};
}

/** Macros d'un repas pour une quantité de plat donnée + éventuel féculent ajouté. */
export function mealMacrosFor(
	recipe: Omit<PortionRecipe, 'ingredients'>,
	quantityG: number,
	extraStarchG?: number | null,
	extraStarchIngredientName?: string | null
): MealMacros {
	if (!recipeHasMacros(recipe)) {
		return { calcCalories: null, calcProteinG: null, calcCarbsG: null, calcFatG: null, calcFiberG: null };
	}
	const factor = quantityG / recipeReferenceYieldG(recipe.referenceYieldG);
	let m = addMacros(ZERO, recipeBaseMacros(recipe), factor);
	if (extraStarchG != null && extraStarchG > 0 && extraStarchIngredientName) {
		const per100 = starchReferenceFor(extraStarchIngredientName);
		if (per100) m = addMacros(m, per100, extraStarchG / 100);
	}
	return toMealMacros(m);
}

/** Portion d'un repas pour viser les cibles kcal / protéines du créneau. */
export function computeMealPortion(
	recipe: PortionRecipe,
	slot: { kcal: number | null; proteinG: number | null }
): MealPortion {
	const refG = recipeReferenceYieldG(recipe.referenceYieldG);
	const base = recipeBaseMacros(recipe);
	const baseKcal = atwaterKcal(base);

	if (!recipeHasMacros(recipe) || baseKcal <= 0) {
		return {
			quantityG: refG,
			extraStarchG: null,
			extraStarchIngredientName: null,
			...mealMacrosFor(recipe, refG)
		};
	}

	const kcalScale = slot.kcal != null && slot.kcal > 0 ? slot.kcal / baseKcal : null;
	const proteinScale =
		slot.proteinG != null && slot.proteinG > 0 && base.proteinG > 0 ? slot.proteinG / base.proteinG : null;

	let scale = clampScale(
		kcalScale != null && proteinScale != null
			? Math.min(kcalScale, proteinScale)
			: (kcalScale ?? proteinScale ?? 1)
	);

	let extraStarchG: number | null = null;
	let extraStarchIngredientName: string | null = null;

	if (slot.kcal != null && slot.kcal > 0) {
		const targetKcal = slot.kcal;
		const starch = targetKcal > baseKcal * scale ? findStarchIngredient(recipe) : null;
		if (starch) {
			const kcalPerG = atwaterKcal(starch.per100) / 100;
			const maxTotalG = kcalPerG < 1.5 ? MAX_STARCH_G_FRESH : MAX_STARCH_G_DRY;
			let grams = (targetKcal - baseKcal * scale) / kcalPerG;
			if (starch.quantityG * scale + grams > maxTotalG) {
				// Plafond atteint : facteur recette et grammes ajoutés tels que kcal = cible et féculent total = plafond.
				const denom = baseKcal - starch.quantityG * kcalPerG;
				if (denom > 0) {
					scale = Math.max(scale, clampScale((targetKcal - maxTotalG * kcalPerG) / denom));
				}
				grams = Math.max(0, maxTotalG - starch.quantityG * scale);
			}
			grams = Math.round(grams);
			if (grams > 0) {
				extraStarchG = grams;
				extraStarchIngredientName = starch.name;
			}
		}
		const gap = targetKcal - baseKcal * scale - (extraStarchG ?? 0) * (starch ? atwaterKcal(starch.per100) / 100 : 0);
		if (gap > 1) {
			scale = clampScale(scale + gap / baseKcal);
		}
	}

	const quantityG = refG * scale;
	return {
		quantityG,
		extraStarchG,
		extraStarchIngredientName,
		...mealMacrosFor(recipe, quantityG, extraStarchG, extraStarchIngredientName)
	};
}

/**
 * Fraction du budget journalier par créneau.
 * Sans jeûne : petit-déj 30 %, déjeuner 35 %, dîner 35 %.
 * Avec jeûne : déjeuner et dîner 50 % chacun ; le petit-déj reste en BDD à 30 % (masqué côté UI).
 */
export function mealBudgetFraction(position: string, intermittentFasting: boolean): number {
	if (position === 'BREAKFAST') return 0.3;
	if (position === 'LUNCH' || position === 'DINNER') return intermittentFasting ? 0.5 : 0.35;
	return 1 / 3;
}

/** Cibles kcal / protéines d'un créneau. */
export function mealSlotTargets(
	position: string,
	intermittentFasting: boolean,
	mealBudgetKcal: number | null,
	dailyProteinG: number | null
): { kcal: number | null; proteinG: number | null } {
	const frac = mealBudgetFraction(position, intermittentFasting);
	return {
		kcal: mealBudgetKcal != null && mealBudgetKcal > 0 ? mealBudgetKcal * frac : null,
		proteinG: dailyProteinG != null && dailyProteinG > 0 ? dailyProteinG * frac : null
	};
}
