import { normalizeIngredientName } from './normalizeIngredientName';
import { EGG_UNIT_G, isEggIngredient, recipeReferenceYieldG } from './scaleMealIngredients';

/**
 * Macros d'un repas = macros de la fiche recette (saisies par l'admin) × facteur de portion
 * + complément féculent cru ajouté par le programme (`extraStarchG` de `extraStarchIngredientName`).
 * Quand le planificateur fixe les grammes de certains ingrédients (`ingredientGrams` : seuils planchers,
 * féculent tampon), ces ingrédients sont comptés à leurs grammes et le reste de la recette au facteur.
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
	/** Grammes des ingrédients de la recette fixés hors facteur (seuils planchers, féculent tampon). */
	ingredientGrams: MealComplement[];
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

/**
 * Seuils planchers par portion, en grammes : en dessous, l'ingrédient n'est plus cuisinable (viande qui
 * sèche, demi-noix isolée…). Jamais au-dessus de la quantité de la fiche recette.
 */
export const INGREDIENT_FLOORS_G = {
	/** Viandes, poissons, tofu, tempeh. */
	protein: 70,
	/** Un œuf entier, insécable. */
	egg: EGG_UNIT_G,
	/** Une vraie tranche. */
	bread: 35,
	nuts: 10,
	/** Féculents (riz, avoine, pâtes crues…). */
	starch: 30
} as const;

type Reference = { tokens: string[]; per100: MacroValues };

/**
 * Protéines et oléagineux à seuil plancher — valeurs Ciqual pour 100 g tel qu'acheté.
 * Chaque mot-clé doit préfixer un mot du libellé (chiffres compris : « 15 » % MG) ; ordre = priorité.
 */
const PROTEIN_REFERENCE: Reference[] = [
	{ tokens: ['bresaola'], per100: { proteinG: 32, carbsG: 0.5, fatG: 2.6, fiberG: 0 } },
	{ tokens: ['bacon'], per100: { proteinG: 19, carbsG: 1, fatG: 5, fiberG: 0 } },
	{ tokens: ['jambon'], per100: { proteinG: 20, carbsG: 1, fatG: 3, fiberG: 0 } },
	{ tokens: ['dinde', 'fume'], per100: { proteinG: 21, carbsG: 1, fatG: 2, fiberG: 0 } },
	{ tokens: ['blanc', 'dinde'], per100: { proteinG: 21, carbsG: 1, fatG: 2, fiberG: 0 } },
	{ tokens: ['hache', '15'], per100: { proteinG: 18.5, carbsG: 0, fatG: 15, fiberG: 0 } },
	{ tokens: ['hache'], per100: { proteinG: 21, carbsG: 0, fatG: 5, fiberG: 0 } },
	{ tokens: ['porc'], per100: { proteinG: 22, carbsG: 0, fatG: 3, fiberG: 0 } },
	{ tokens: ['poulet'], per100: { proteinG: 23.5, carbsG: 0, fatG: 1.5, fiberG: 0 } },
	{ tokens: ['dinde'], per100: { proteinG: 24, carbsG: 0, fatG: 1.2, fiberG: 0 } },
	{ tokens: ['maquereau', 'fume'], per100: { proteinG: 19, carbsG: 0, fatG: 22, fiberG: 0 } },
	{ tokens: ['maquereau'], per100: { proteinG: 20, carbsG: 0, fatG: 13, fiberG: 0 } },
	{ tokens: ['saumon', 'fume'], per100: { proteinG: 22, carbsG: 0, fatG: 10, fiberG: 0 } },
	{ tokens: ['saumon'], per100: { proteinG: 20, carbsG: 0, fatG: 13, fiberG: 0 } },
	{ tokens: ['truite'], per100: { proteinG: 22, carbsG: 0, fatG: 6, fiberG: 0 } },
	{ tokens: ['sardine'], per100: { proteinG: 23, carbsG: 0, fatG: 10, fiberG: 0 } },
	{ tokens: ['thon'], per100: { proteinG: 25, carbsG: 0, fatG: 1, fiberG: 0 } },
	{ tokens: ['crevette'], per100: { proteinG: 21, carbsG: 0, fatG: 1, fiberG: 0 } },
	{ tokens: ['cabillaud'], per100: { proteinG: 18, carbsG: 0, fatG: 0.7, fiberG: 0 } },
	{ tokens: ['colin'], per100: { proteinG: 18, carbsG: 0, fatG: 0.7, fiberG: 0 } },
	{ tokens: ['tofu', 'fume'], per100: { proteinG: 16, carbsG: 1.5, fatG: 9, fiberG: 1 } },
	{ tokens: ['tofu'], per100: { proteinG: 13, carbsG: 1.5, fatG: 8, fiberG: 1 } },
	{ tokens: ['tempeh'], per100: { proteinG: 19, carbsG: 7, fatG: 11, fiberG: 5 } }
];

const NUT_REFERENCE: Reference[] = [
	{ tokens: ['beurre', 'cacahuete'], per100: { proteinG: 25, carbsG: 13, fatG: 50, fiberG: 6 } },
	{ tokens: ['cacahuete'], per100: { proteinG: 26, carbsG: 10, fatG: 49, fiberG: 8.5 } },
	{ tokens: ['cajou'], per100: { proteinG: 18, carbsG: 27, fatG: 46, fiberG: 3.5 } },
	{ tokens: ['bresil'], per100: { proteinG: 14, carbsG: 4, fatG: 66, fiberG: 7.5 } },
	{ tokens: ['pecan'], per100: { proteinG: 9, carbsG: 4.5, fatG: 72, fiberG: 9.5 } },
	{ tokens: ['pistache'], per100: { proteinG: 21, carbsG: 13, fatG: 46, fiberG: 10 } },
	{ tokens: ['noisette'], per100: { proteinG: 15, carbsG: 7, fatG: 61, fiberG: 10 } },
	{ tokens: ['pignon'], per100: { proteinG: 14, carbsG: 4, fatG: 68, fiberG: 3.7 } },
	{ tokens: ['amande'], per100: { proteinG: 21, carbsG: 6, fatG: 52, fiberG: 12 } },
	{ tokens: ['noix'], per100: { proteinG: 15, carbsG: 7, fatG: 65, fiberG: 6.5 } }
];

/** Œuf entier cru (Ciqual). */
const EGG_PER100: MacroValues = { proteinG: 12.7, carbsG: 0.3, fatG: 9.8, fiberG: 0 };

function matchReference(table: Reference[], name: string): MacroValues | null {
	const words = normalizeIngredientName(name).split(/[^a-z0-9]+/);
	return table.find((r) => r.tokens.every((t) => words.some((w) => w.startsWith(t))))?.per100 ?? null;
}

const isCategory = (category: string | null | undefined, prefix: string) =>
	category != null && normalizeIngredientName(category).startsWith(prefix);

/** Seuil plancher (grammes) et valeurs pour 100 g d'un ingrédient à seuil, ou null s'il n'en a pas. */
export function ingredientFloor(ing: {
	name: string;
	category?: string | null;
}): { floorG: number; per100: MacroValues; isEgg: boolean } | null {
	if (isEggIngredient(ing.name)) return { floorG: INGREDIENT_FLOORS_G.egg, per100: EGG_PER100, isEgg: true };
	const proteinOk = isCategory(ing.category, 'viande') || isCategory(ing.category, 'poisson') || /tofu|tempeh/i.test(ing.name);
	const protein = proteinOk ? matchReference(PROTEIN_REFERENCE, ing.name) : null;
	if (protein) return { floorG: INGREDIENT_FLOORS_G.protein, per100: protein, isEgg: false };
	const nuts = isCategory(ing.category, 'oleagineux') ? matchReference(NUT_REFERENCE, ing.name) : null;
	if (nuts) return { floorG: INGREDIENT_FLOORS_G.nuts, per100: nuts, isEgg: false };
	const starch = isCategory(ing.category, 'feculent') ? starchReferenceFor(ing.name) : null;
	if (starch) {
		const bread = normalizeIngredientName(ing.name).startsWith('pain');
		return { floorG: bread ? INGREDIENT_FLOORS_G.bread : INGREDIENT_FLOORS_G.starch, per100: starch, isEgg: false };
	}
	return null;
}

/** Ingrédient de la recette dont les grammes ne suivent pas seulement le facteur de portion. */
export type RecipePart = {
	name: string;
	/** Grammes de la fiche. */
	quantityG: number;
	/** Seuil plancher, jamais au-dessus de la fiche. */
	floorG: number;
	per100: MacroValues;
	isEgg: boolean;
	/** Féculent principal : grammes libres (tampon), indépendants du facteur. */
	isBuffer: boolean;
};

/**
 * Découpage d'une recette : ingrédients à seuil plancher (dont le féculent tampon) et reste de la fiche
 * (légumes, sauces, matières grasses…) = macros de la fiche − ingrédients à seuil, borné à 0.
 */
export function recipeParts(recipe: PortionRecipe): { parts: RecipePart[]; rest: MacroValues } {
	const buffer = findStarchIngredient(recipe);
	const parts: RecipePart[] = [];
	for (const ing of recipe.ingredients ?? []) {
		if (ing.quantityG == null || ing.quantityG <= 0) continue;
		const floor = ingredientFloor(ing);
		if (!floor) continue;
		const isBuffer = buffer != null && ing.name === buffer.name && !parts.some((p) => p.isBuffer);
		parts.push({
			name: ing.name,
			quantityG: ing.quantityG,
			floorG: floor.isEgg ? floor.floorG : Math.min(floor.floorG, ing.quantityG),
			per100: isBuffer ? buffer.per100 : floor.per100,
			isEgg: floor.isEgg,
			isBuffer
		});
	}
	let rest = recipeBaseMacros(recipe);
	for (const p of parts) rest = addMacros(rest, p.per100, -p.quantityG / 100);
	return {
		parts,
		rest: {
			proteinG: Math.max(0, rest.proteinG),
			carbsG: Math.max(0, rest.carbsG),
			fatG: Math.max(0, rest.fatG),
			fiberG: Math.max(0, rest.fiberG)
		}
	};
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

/**
 * Macros d'un repas pour une quantité de plat donnée + éventuels compléments ajoutés. Avec
 * `ingredientGrams`, les ingrédients à seuil sont comptés à leurs grammes et le reste au facteur.
 */
export function mealMacrosFor(
	recipe: PortionRecipe,
	quantityG: number,
	extraStarchG?: number | null,
	extraStarchIngredientName?: string | null,
	complements?: MealComplement[] | null,
	ingredientGrams?: MealComplement[] | null
): MealMacros {
	if (!recipeHasMacros(recipe)) {
		return { calcCalories: null, calcProteinG: null, calcCarbsG: null, calcFatG: null, calcFiberG: null };
	}
	const factor = quantityG / recipeReferenceYieldG(recipe.referenceYieldG);
	let m: MacroValues;
	if (ingredientGrams?.length) {
		const { parts, rest } = recipeParts(recipe);
		m = addMacros(ZERO, rest, factor);
		for (const p of parts) {
			const grams = ingredientGrams.find((i) => i.name === p.name)?.grams ?? p.quantityG * factor;
			m = addMacros(m, p.per100, grams / 100);
		}
	} else {
		m = addMacros(ZERO, recipeBaseMacros(recipe), factor);
	}
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
 * Sans jeûne : p'tit déj ou collation 20 %, déjeuner 40 %, dîner 40 %.
 * Avec jeûne : déjeuner et dîner 50 % chacun ; le p'tit déj reste en BDD à 20 % (masqué côté UI).
 */
export function mealBudgetFraction(position: string, intermittentFasting: boolean): number {
	if (position === 'BREAKFAST') return 0.2;
	if (position === 'LUNCH' || position === 'DINNER') return intermittentFasting ? 0.5 : 0.4;
	return 1 / 3;
}
