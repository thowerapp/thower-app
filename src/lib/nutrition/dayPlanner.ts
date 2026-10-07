import {
	DEFAULT_COMPLEMENT_STARCH,
	MAX_STARCH_G_DRY,
	MAX_STARCH_G_FRESH,
	SCALE_MAX,
	SCALE_MIN,
	atwaterKcal,
	findStarchIngredient,
	mealBudgetFraction,
	mealMacrosFor,
	recipeBaseMacros,
	recipeHasMacros,
	starchReferenceFor,
	type MacroValues,
	type MealPortion,
	type PortionRecipe
} from './mealPortion';
import type { MealMacroTargets } from './nutritionTargets';
import { recipeReferenceYieldG } from './scaleMealIngredients';

/**
 * Répartition d'une journée de repas à partir des recettes de l'admin (macros de la fiche, jamais modifiées).
 *
 * Les recettes du catalogue sont plus protéinées que les cibles (23 à 35 % des kcal en protéines contre
 * 21 à 25 % visés) : aucune association de recettes n'atteint à la fois protéines et kcal. Le programme
 * ajuste donc ensemble, pour toute la journée :
 *  - le facteur de portion de chaque recette ;
 *  - un complément féculent cru par repas (le féculent de la recette, sinon riz complet), plafonné à
 *    250 g de féculents par repas recette comprise (400 g pour pommes de terre / patates douces).
 * Objectif : totaux de la journée au plus près des cibles du profil (moindres carrés pondérés, protéines
 * prioritaires), avec un rappel vers la part de chaque créneau (30/35/35, 50/50 en jeûne) pour garder
 * des repas équilibrés entre eux.
 * En jeûne, le petit-déjeuner (masqué, hors total) est ajusté seul sur sa part de 30 %.
 */

/** Poids des écarts relatifs : protéines, glucides, lipides, fibres. */
const TARGET_WEIGHTS = [10, 3, 3, 1] as const;
/** Poids du rappel vers la part de kcal de chaque créneau. */
const SHARE_WEIGHT = 0.5;
/** Passes de la descente : complètes pour la journée retenue, réduites pour comparer les candidats. */
const SWEEPS = 300;
const SCORING_SWEEPS = 40;

export type PlannerMeal = {
	position: string;
	recipe: PortionRecipe;
	/** Quantité de plat imposée (curseur de l'édition d'un repas) : seul le complément est ajusté. */
	fixedQuantityG?: number | null;
};

export type DayFitInput = {
	meals: PlannerMeal[];
	/** Passes de la descente (défaut : convergence complète). */
	sweeps?: number;
	daily: MealMacroTargets | null;
	intermittentFasting: boolean;
	/** Apport des repas non ajustables comptés dans la journée (manuels, déjà mangés). */
	fixed?: MacroValues | null;
};

type Vec = [number, number, number, number];

const toVec = (m: MacroValues): Vec => [m.proteinG, m.carbsG, m.fatG, m.fiberG];

/** true si le repas compte dans le total du jour (petit-déjeuner masqué en jeûne). */
export function isCountedMeal(position: string, intermittentFasting: boolean): boolean {
	return !(intermittentFasting && position === 'BREAKFAST');
}

type FitVar = {
	meal: PlannerMeal;
	refG: number;
	base: Vec;
	baseKcal: number;
	starchName: string;
	starchPer100: Vec;
	starchKcalPerG: number;
	/** Féculent de la recette (g à facteur 1) compté dans le plafond. */
	recipeStarchG: number;
	capG: number;
	shareKcal: number;
	sFixed: boolean;
	s: number;
	g: number;
};

function referencePortion(recipe: PortionRecipe): MealPortion {
	const refG = recipeReferenceYieldG(recipe.referenceYieldG);
	return { quantityG: refG, extraStarchG: null, extraStarchIngredientName: null, ...mealMacrosFor(recipe, refG) };
}

function buildVar(meal: PlannerMeal, shareKcal: number): FitVar {
	const recipe = meal.recipe;
	const refG = recipeReferenceYieldG(recipe.referenceYieldG);
	const base = toVec(recipeBaseMacros(recipe));
	const baseKcal = atwaterKcal(recipeBaseMacros(recipe));
	const own = findStarchIngredient(recipe);
	const per100 = own?.per100 ?? starchReferenceFor(DEFAULT_COMPLEMENT_STARCH)!;
	const starchKcalPerG = atwaterKcal(per100) / 100;
	const sFixed = meal.fixedQuantityG != null && meal.fixedQuantityG > 0;
	const s = sFixed
		? meal.fixedQuantityG! / refG
		: Math.min(SCALE_MAX, Math.max(SCALE_MIN, baseKcal > 0 ? shareKcal / baseKcal : 1));
	return {
		meal,
		refG,
		base,
		baseKcal,
		starchName: own?.name ?? DEFAULT_COMPLEMENT_STARCH,
		starchPer100: toVec(per100).map((x) => x / 100) as Vec,
		starchKcalPerG,
		recipeStarchG: own?.quantityG ?? 0,
		capG: starchKcalPerG < 1.5 ? MAX_STARCH_G_FRESH : MAX_STARCH_G_DRY,
		shareKcal,
		sFixed,
		s,
		g: 0
	};
}

function maxComplementG(v: FitVar): number {
	return Math.max(0, v.capG - v.recipeStarchG * v.s);
}

/**
 * Ajuste facteurs et compléments d'un groupe de repas vers des cibles (descente par coordonnées bornée,
 * minimum exact par variable ; problème convexe à bornes près).
 */
function solveGroup(vars: FitVar[], targets: Vec, fixed: Vec, sweeps = SWEEPS): void {
	const tot: Vec = [...fixed];
	for (const v of vars) for (let j = 0; j < 4; j++) tot[j] += v.base[j] * v.s + v.starchPer100[j] * v.g;

	// Nouvelle valeur d'une variable (facteur ou complément) d'un repas : minimum exact de l'objectif sur cet axe.
	const step = (v: FitVar, coef: Vec, kcalCoef: number, current: number, lo: number, hi: number): number => {
		const mealKcal = v.baseKcal * v.s + v.starchKcalPerG * v.g;
		let num = 0;
		let den = 0;
		for (let j = 0; j < 4; j++) {
			if (targets[j] <= 0) continue;
			const a = coef[j] / targets[j];
			num += TARGET_WEIGHTS[j] * (tot[j] / targets[j] - 1) * a;
			den += TARGET_WEIGHTS[j] * a * a;
		}
		if (v.shareKcal > 0) {
			const a = kcalCoef / v.shareKcal;
			num += SHARE_WEIGHT * (mealKcal / v.shareKcal - 1) * a;
			den += SHARE_WEIGHT * a * a;
		}
		if (den <= 0) return current;
		return Math.min(hi, Math.max(lo, current - num / den));
	};
	const move = (coef: Vec, delta: number) => {
		for (let j = 0; j < 4; j++) tot[j] += coef[j] * delta;
	};

	for (let sweep = 0; sweep < sweeps; sweep++) {
		let maxDelta = 0;
		for (const v of vars) {
			if (!v.sFixed) {
				const next = step(v, v.base, v.baseKcal, v.s, SCALE_MIN, SCALE_MAX);
				move(v.base, next - v.s);
				maxDelta = Math.max(maxDelta, Math.abs(next - v.s));
				v.s = next;
				const capped = Math.min(v.g, maxComplementG(v));
				move(v.starchPer100, capped - v.g);
				v.g = capped;
			}
			const nextG = step(v, v.starchPer100, v.starchKcalPerG, v.g, 0, maxComplementG(v));
			move(v.starchPer100, nextG - v.g);
			maxDelta = Math.max(maxDelta, Math.abs(nextG - v.g) / 100);
			v.g = nextG;
		}
		if (maxDelta < 1e-5) break;
	}
}

function toPortion(v: FitVar): MealPortion {
	const quantityG = v.refG * v.s;
	const grams = Math.round(v.g);
	const extraStarchG = grams > 0 ? grams : null;
	const extraStarchIngredientName = extraStarchG != null ? v.starchName : null;
	return {
		quantityG,
		extraStarchG,
		extraStarchIngredientName,
		...mealMacrosFor(v.meal.recipe, quantityG, extraStarchG, extraStarchIngredientName)
	};
}

/**
 * Portions (facteur + complément) des repas d'une journée, dans l'ordre de `meals`.
 * Sans cibles (profil incomplet) : portions de référence des recettes.
 */
export function fitDay(input: DayFitInput): MealPortion[] {
	const { meals, daily, intermittentFasting } = input;
	if (!daily) return meals.map((m) => referencePortion(m.recipe));

	const result: (MealPortion | null)[] = meals.map(() => null);
	const counted: number[] = [];
	meals.forEach((m, k) => {
		if (!recipeHasMacros(m.recipe)) result[k] = referencePortion(m.recipe);
		else if (isCountedMeal(m.position, intermittentFasting)) counted.push(k);
		else {
			// Petit-déjeuner masqué (jeûne) : ajusté seul sur sa part, prêt si le jeûne est désactivé.
			const frac = mealBudgetFraction(m.position, false);
			const v = buildVar(m, daily.kcal * frac);
			solveGroup([v], toVec(daily).map((x) => x * frac) as Vec, [0, 0, 0, 0], input.sweeps);
			result[k] = toPortion(v);
		}
	});

	if (counted.length > 0) {
		const fixedVec: Vec = input.fixed ? toVec(input.fixed) : [0, 0, 0, 0];
		const fixedKcal = input.fixed ? atwaterKcal(input.fixed) : 0;
		const fracs = counted.map((k) => mealBudgetFraction(meals[k].position, intermittentFasting));
		const fracSum = fracs.reduce((s, f) => s + f, 0);
		const adjustableKcal = Math.max(0, daily.kcal - fixedKcal);
		const vars = counted.map((k, i) => buildVar(meals[k], (adjustableKcal * fracs[i]) / fracSum));
		solveGroup(vars, toVec(daily), fixedVec, input.sweeps);
		counted.forEach((k, i) => (result[k] = toPortion(vars[i])));
	}

	return result as MealPortion[];
}

/** Écart pondéré des totaux d'une journée à ses cibles (0 = parfait). */
export function dayDeviationScore(
	portions: MealPortion[],
	meals: { position: string }[],
	daily: MealMacroTargets,
	intermittentFasting: boolean,
	fixed?: MacroValues | null
): number {
	const tot: Vec = fixed ? toVec(fixed) : [0, 0, 0, 0];
	portions.forEach((p, k) => {
		if (!isCountedMeal(meals[k].position, intermittentFasting)) return;
		tot[0] += p.calcProteinG ?? 0;
		tot[1] += p.calcCarbsG ?? 0;
		tot[2] += p.calcFatG ?? 0;
		tot[3] += p.calcFiberG ?? 0;
	});
	const t = toVec(daily);
	let score = 0;
	for (let j = 0; j < 4; j++) if (t[j] > 0) score += TARGET_WEIGHTS[j] * (tot[j] / t[j] - 1) ** 2;
	return score;
}

/** Cibles multipliées par un ratio (journée partielle pendant le choix des recettes). */
function scaleTargets(t: MealMacroTargets, r: number): MealMacroTargets {
	return { kcal: t.kcal * r, proteinG: t.proteinG * r, carbsG: t.carbsG * r, fatG: t.fatG * r, fiberG: t.fiberG * r };
}

export type PickableRecipe = PortionRecipe & { id: string };

/** Ordre de remplissage : le premier repas principal est tiré au sort, les suivants sont choisis. */
const FILL_ORDER = ['LUNCH', 'DINNER', 'BREAKFAST'];

/** Score d'une journée jugé suffisant (≈ 1,5 % d'écart sur les protéines, le reste proportionné). */
const GOOD_DAY_SCORE = 0.004;
/** Tirages du premier repas tentés au maximum quand la journée obtenue reste loin des cibles. */
const MAX_DRAWS = 6;

type PickArgs<R extends PickableRecipe> = {
	positionsToFill: string[];
	existing: (PlannerMeal & { recipeId?: string | null })[];
	pools: { BREAKFAST: R[]; MEAL: R[] };
	daily: MealMacroTargets | null;
	intermittentFasting: boolean;
	fixed?: MacroValues | null;
	recentRecipeIds: Set<string>;
	random: () => number;
};

/** Un remplissage glouton de la journée : premier repas tiré au sort, les suivants choisis au mieux. */
function fillDayOnce<R extends PickableRecipe>(args: PickArgs<R>): Map<string, R> {
	const { daily, intermittentFasting, random } = args;
	const chosen = new Map<string, R>();
	const usedToday = new Set(args.existing.map((m) => m.recipeId).filter((id): id is string => !!id));
	const allPositions = [...args.existing.map((m) => m.position), ...args.positionsToFill];
	const countedFracSum = allPositions
		.filter((p) => isCountedMeal(p, intermittentFasting))
		.reduce((s, p) => s + mealBudgetFraction(p, intermittentFasting), 0);

	const order = [...args.positionsToFill].sort((a, b) => FILL_ORDER.indexOf(a) - FILL_ORDER.indexOf(b));
	for (const position of order) {
		const pool = position === 'BREAKFAST' ? args.pools.BREAKFAST : args.pools.MEAL;
		const fresh = pool.filter((r) => !usedToday.has(r.id) && !args.recentRecipeIds.has(r.id));
		const notToday = pool.filter((r) => !usedToday.has(r.id));
		const eligible = fresh.length > 0 ? fresh : notToday.length > 0 ? notToday : pool;
		if (eligible.length === 0) continue;

		const current: PlannerMeal[] = [
			...args.existing,
			...[...chosen].map(([p, recipe]) => ({ position: p, recipe }))
		];
		const hasCountedMeal = current.some((m) => isCountedMeal(m.position, intermittentFasting));
		const counted = isCountedMeal(position, intermittentFasting);

		let pick: R;
		if (!daily || !counted || !hasCountedMeal) {
			pick = eligible[Math.floor(random() * eligible.length)];
		} else {
			// Journée partielle : cibles au prorata des créneaux déjà remplis + le candidat.
			const subsetFrac = [...current.map((m) => m.position), position]
				.filter((p) => isCountedMeal(p, intermittentFasting))
				.reduce((s, p) => s + mealBudgetFraction(p, intermittentFasting), 0);
			const partial = scaleTargets(daily, countedFracSum > 0 ? subsetFrac / countedFracSum : 1);
			let best = eligible[0];
			let bestScore = Infinity;
			for (const candidate of eligible) {
				const meals = [...current, { position, recipe: candidate }];
				const portions = fitDay({ meals, daily: partial, intermittentFasting, fixed: args.fixed, sweeps: SCORING_SWEEPS });
				const score = dayDeviationScore(portions, meals, partial, intermittentFasting, args.fixed);
				if (score < bestScore) {
					bestScore = score;
					best = candidate;
				}
			}
			pick = best;
		}
		chosen.set(position, pick);
		usedToday.add(pick.id);
	}
	return chosen;
}

/**
 * Choisit les recettes des créneaux à remplir d'une journée :
 *  - recettes non servies les jours récents (`recentRecipeIds`) et pas deux fois dans la journée ;
 *  - premier repas principal tiré au sort (`random`), sauf si la journée en a déjà un ;
 *  - chaque créneau suivant reçoit la recette qui, après ajustement de la journée, la rapproche le plus
 *    des cibles (petit-déjeuner masqué en jeûne : tiré au sort) ;
 *  - si la journée obtenue reste loin des cibles, nouveau tirage du premier repas (jusqu'à 6), la
 *    meilleure journée est retenue.
 */
export function pickDayRecipes<R extends PickableRecipe>(args: PickArgs<R>): Map<string, R> {
	const { daily, intermittentFasting } = args;
	let best = fillDayOnce(args);
	if (!daily) return best;

	const score = (chosen: Map<string, R>) => {
		const meals: PlannerMeal[] = [...args.existing, ...[...chosen].map(([position, recipe]) => ({ position, recipe }))];
		const portions = fitDay({ meals, daily, intermittentFasting, fixed: args.fixed, sweeps: SCORING_SWEEPS });
		return dayDeviationScore(portions, meals, daily, intermittentFasting, args.fixed);
	};
	let bestScore = score(best);
	for (let draw = 1; draw < MAX_DRAWS && bestScore > GOOD_DAY_SCORE; draw++) {
		const attempt = fillDayOnce(args);
		const attemptScore = score(attempt);
		if (attemptScore < bestScore) {
			best = attempt;
			bestScore = attemptScore;
		}
	}
	return best;
}
