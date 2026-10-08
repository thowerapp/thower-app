import { normalizeIngredientName } from './normalizeIngredientName';
import { recipeReferenceYieldG } from './scaleMealIngredients';

/**
 * Macros d'un repas = macros de la fiche recette (saisies par l'admin) × facteur de portion
 * + complément féculent cru ajouté par le programme (`extraStarchG` de `extraStarchIngredientName`).
 * Les kcal sont toujours recalculées depuis les macros (Atwater) : 4 P + 4 G + 9 L + 2 fibres.
 * La répartition d'une journée (facteurs et compléments) est calculée par $lib/nutrition/dayPlanner.
 */

export const SCALE_MIN = 0.15;
export const SCALE_MAX = 2.5;
/** Féculent sec au maximum sur un repas (portion recette + complément), en grammes crus (~450 g cuits). */
export const MAX_STARCH_G_DRY = 160;
/** Idem pour les féculents frais peu denses (pommes de terre, patates douces). */
export const MAX_STARCH_G_FRESH = 400;
/** Complément servi quand la recette n'a pas de féculent. */
export const DEFAULT_COMPLEMENT_STARCH = 'Riz complet';
/**
 * Compléments ajoutés par le programme, servis en dessert / collation (valeurs Ciqual pour 100 g, glucides
 * hors fibres ; plafond par repas) :
 *  - flocons d'avoine et banane : solde de glucides au-delà du plafond de féculents, sources denses et digestes ;
 *  - skyr nature : protéines maigres, pour viser les protéines sans les lipides des plats (les recettes
 *    apportent ~0,6 g de lipides par gramme de protéines contre ~0,46 visé).
 */
export const MEAL_COMPLEMENTS: { name: string; category: string; per100: MacroValues; maxG: number }[] = [
	{ name: 'Flocons d’avoine', category: 'Féculents', per100: { proteinG: 13.5, carbsG: 58.7, fatG: 7, fiberG: 10 }, maxG: 80 },
	{ name: 'Banane', category: 'Fruits', per100: { proteinG: 1.1, carbsG: 20, fatG: 0.3, fiberG: 2.5 }, maxG: 240 },
	{ name: 'Skyr nature', category: 'Produits frais', per100: { proteinG: 10, carbsG: 4, fatG: 0.2, fiberG: 0 }, maxG: 150 }
];

/** Catégorie de liste de courses d'un complément (Féculents par défaut : féculent de référence). */
export function complementCategory(name: string): string {
	return MEAL_COMPLEMENTS.find((c) => c.name === name)?.category ?? 'Féculents';
}

/** Complément ajouté à un repas (hors féculent de la recette). */
export type MealComplement = { name: string; grams: number };

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
	/** Compléments (MEAL_COMPLEMENTS) ajoutés au repas. */
	complements: MealComplement[];
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

function addMacros(a: MacroValues, b: MacroValues, factorB: number): MacroValues {
	return {
		proteinG: a.proteinG + b.proteinG * factorB,
		carbsG: a.carbsG + b.carbsG * factorB,
		fatG: a.fatG + b.fatG * factorB,
		fiberG: a.fiberG + b.fiberG * factorB
	};
}

const ZERO: MacroValues = { proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 };

export function recipeHasMacros(recipe: Omit<PortionRecipe, 'ingredients'>): boolean {
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

/** Valeurs pour 100 g d'un complément (MEAL_COMPLEMENTS ou féculent de référence), ou null. */
export function complementReferenceFor(name: string): MacroValues | null {
	return MEAL_COMPLEMENTS.find((c) => c.name === name)?.per100 ?? starchReferenceFor(name);
}

/** Macros d'un repas pour une quantité de plat donnée + éventuels compléments ajoutés. */
export function mealMacrosFor(
	recipe: Omit<PortionRecipe, 'ingredients'>,
	quantityG: number,
	extraStarchG?: number | null,
	extraStarchIngredientName?: string | null,
	complements?: MealComplement[] | null
): MealMacros {
	if (!recipeHasMacros(recipe)) {
		return { calcCalories: null, calcProteinG: null, calcCarbsG: null, calcFatG: null, calcFiberG: null };
	}
	const factor = quantityG / recipeReferenceYieldG(recipe.referenceYieldG);
	let m = addMacros(ZERO, recipeBaseMacros(recipe), factor);
	for (const { grams, name } of [
		{ grams: extraStarchG, name: extraStarchIngredientName },
		...(complements ?? [])
	]) {
		if (grams == null || grams <= 0 || !name) continue;
		const per100 = complementReferenceFor(name);
		if (per100) m = addMacros(m, per100, grams / 100);
	}
	return toMealMacros(m);
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
