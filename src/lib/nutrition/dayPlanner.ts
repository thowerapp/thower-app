import {
	MEAL_COMPLEMENTS,
	DEFAULT_COMPLEMENT_STARCH,
	MAX_STARCH_G_DRY,
	MAX_STARCH_G_FRESH,
	SCALE_MAX,
	SCALE_MIN,
	atwaterKcal,
	ingredientFloor,
	mealBudgetFraction,
	mealMacrosFor,
	recipeBaseMacros,
	recipeHasMacros,
	recipeParts,
	starchReferenceFor,
	type MacroValues,
	type MealPortion,
	type PortionRecipe
} from './mealPortion';
import type { MealMacroTargets } from './nutritionTargets';
import { EGG_UNIT_G, recipeReferenceYieldG } from './scaleMealIngredients';

/**
 * Répartition d'une journée de repas à partir des recettes de l'admin (macros de la fiche, jamais modifiées).
 *
 * Les recettes du catalogue sont plus protéinées que les cibles (23 à 35 % des kcal en protéines contre
 * 21 à 25 % visés) : aucune association de recettes n'atteint à la fois protéines et kcal. Le programme
 * ajuste donc ensemble, pour toute la journée :
 *  - le facteur de portion de chaque recette ;
 *  - un complément féculent cru par repas (le féculent de la recette, sinon riz complet), plafonné à
 *    160 g de féculents secs par repas recette comprise (400 g pour pommes de terre / patates douces) ;
 *  - des compléments servis en dessert / collation (MEAL_COMPLEMENTS) : flocons d'avoine et banane pour le
 *    solde de glucides au-delà du plafond de féculents, skyr nature pour des protéines sans lipides.
 * Recettes réalisables en cuisine : les ingrédients à seuil plancher (viandes, poissons, tofu, œufs, pain,
 * oléagineux, féculents — INGREDIENT_FLOORS_G) suivent le facteur sans descendre sous leur seuil, les œufs
 * sont entiers, et le féculent principal de la recette sert de tampon : ses grammes sont libres entre son
 * seuil et le plafond, indépendamment du facteur, pour absorber le solde de kcal et de glucides.
 * Objectif : totaux de la journée au plus près des cibles du profil (moindres carrés pondérés, protéines
 * prioritaires), avec un rappel vers la part de chaque créneau (20/40/40, 50/50 en jeûne) pour les kcal
 * et pour les protéines, afin de garder des repas équilibrés entre eux.
 * En jeûne, le petit-déjeuner (masqué, hors total) est ajusté seul sur sa part de 20 %.
 */

/** Poids des écarts relatifs : protéines, glucides, lipides, fibres. */
const TARGET_WEIGHTS = [10, 3, 3, 0.3] as const;
/** Poids de l'écart au total de kcal de la journée. */
const KCAL_WEIGHT = 20;
/** Poids du rappel vers la part de kcal de chaque créneau. */
const SHARE_WEIGHT = 0.5;
/** Poids du rappel vers la part de protéines de chaque créneau (repas protéinés de façon équilibrée). */
const PROTEIN_SHARE_WEIGHT = 3;
/** Passes de la descente : complètes pour la journée retenue, réduites pour comparer les candidats. */
const SWEEPS = 300;
const SCORING_SWEEPS = 40;

export type PlannerMeal = {
	position: string;
	recipe: PortionRecipe;
	/** Quantité de plat imposée (curseur de l'édition d'un repas) : seuls les compléments sont ajustés. */
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
const vecKcal = (m: Vec) => 4 * m[0] + 4 * m[1] + 9 * m[2] + 2 * m[3];

/** true si le repas compte dans le total du jour (petit-déjeuner masqué en jeûne). */
export function isCountedMeal(position: string, intermittentFasting: boolean): boolean {
	return !(intermittentFasting && position === 'BREAKFAST');
}

/** Grammes libres d'un repas (féculent tampon ou complément), entre un seuil et un plafond. */
type Complement = {
	name: string;
	/** Macros par gramme. */
	perG: Vec;
	minG: number;
	maxG: number;
	/** Complément féculent : absent ou au moins ce seuil plancher (0 = pas de seuil). */
	floorG: number;
	g: number;
};

/** Ingrédient à seuil plancher : max(seuil, grammes fiche × facteur), ou grammes figés (œufs entiers). */
type Floored = {
	name: string;
	q: number;
	floorG: number;
	perG: Vec;
	isEgg: boolean;
	fixedG: number | null;
};

type FitVar = {
	meal: PlannerMeal;
	refG: number;
	/** Macros de la fiche hors ingrédients à seuil, à la portion de référence. */
	rest: Vec;
	baseKcal: number;
	floored: Floored[];
	/** Féculent tampon : celui de la recette, sinon complément riz complet. */
	starch: Complement;
	/** true si le tampon est un ingrédient de la recette. */
	ownStarch: boolean;
	extras: Complement[];
	shareKcal: number;
	shareProteinG: number;
	sFixed: boolean;
	s: number;
};

const flooredG = (f: Floored, s: number) => f.fixedG ?? Math.max(f.floorG, f.q * s);

/** Macros du plat (reste × facteur + ingrédients à seuil), hors tampon et compléments. */
function dishVec(v: FitVar, s: number): Vec {
	const m: Vec = [0, 0, 0, 0];
	for (let j = 0; j < 4; j++) m[j] = v.rest[j] * s;
	for (const f of v.floored) {
		const g = flooredG(f, s);
		for (let j = 0; j < 4; j++) m[j] += f.perG[j] * g;
	}
	return m;
}

function referencePortion(recipe: PortionRecipe): MealPortion {
	const refG = recipeReferenceYieldG(recipe.referenceYieldG);
	return {
		quantityG: refG,
		extraStarchG: null,
		extraStarchIngredientName: null,
		complements: [],
		ingredientGrams: [],
		...mealMacrosFor(recipe, refG)
	};
}

const perGram = (per100: MacroValues) => toVec(per100).map((x) => x / 100) as Vec;

function complement(name: string, per100: MacroValues, minG: number, maxG: number, g = 0, floorG = 0): Complement {
	return { name, perG: perGram(per100), minG, maxG, floorG, g: Math.min(maxG, Math.max(minG, g)) };
}

/** Seuil plancher d'un complément ajouté (féculents secs), 0 sinon. */
const complementFloorG = (name: string, category: string) => ingredientFloor({ name, category })?.floorG ?? 0;

function buildVar(meal: PlannerMeal, shareKcal: number, shareProteinG: number): FitVar {
	const recipe = meal.recipe;
	const refG = recipeReferenceYieldG(recipe.referenceYieldG);
	const baseKcal = atwaterKcal(recipeBaseMacros(recipe));
	const { parts, rest } = recipeParts(recipe);
	const own = parts.find((p) => p.isBuffer) ?? null;
	const starchPer100 = own?.per100 ?? starchReferenceFor(DEFAULT_COMPLEMENT_STARCH)!;
	const capG = atwaterKcal(starchPer100) / 100 < 1.5 ? MAX_STARCH_G_FRESH : MAX_STARCH_G_DRY;
	const sFixed = meal.fixedQuantityG != null && meal.fixedQuantityG > 0;
	const s = sFixed
		? meal.fixedQuantityG! / refG
		: Math.min(SCALE_MAX, Math.max(SCALE_MIN, baseKcal > 0 ? shareKcal / baseKcal : 1));
	return {
		meal,
		refG,
		rest: toVec(rest),
		baseKcal,
		floored: parts
			.filter((p) => !p.isBuffer)
			.map((p) => ({ name: p.name, q: p.quantityG, floorG: p.floorG, perG: perGram(p.per100), isEgg: p.isEgg, fixedG: null })),
		// Tampon : féculent de la recette entre son seuil et le plafond, sinon riz complet entre 0 et le plafond.
		starch: own
			? complement(own.name, starchPer100, Math.min(own.floorG, capG), capG, own.quantityG * s)
			: complement(DEFAULT_COMPLEMENT_STARCH, starchPer100, 0, capG, 0, complementFloorG(DEFAULT_COMPLEMENT_STARCH, 'Féculents')),
		ownStarch: own != null,
		extras: MEAL_COMPLEMENTS.map((c) => complement(c.name, c.per100, 0, c.maxG, 0, complementFloorG(c.name, c.category))),
		shareKcal,
		shareProteinG,
		sFixed,
		s
	};
}

/**
 * Ajuste facteurs, tampons et compléments d'un groupe de repas vers des cibles (descente par coordonnées
 * bornée, minimum exact par variable ; le plat est linéaire par morceaux en facteur, entre les seuils).
 */
function solveGroup(vars: FitVar[], targets: Vec, targetKcal: number, fixed: Vec, sweeps = SWEEPS): void {
	const tot: Vec = [...fixed];
	const complementsOf = (v: FitVar) => [v.starch, ...v.extras];
	const mealVec = (v: FitVar): Vec => {
		const m = dishVec(v, v.s);
		for (const c of complementsOf(v)) for (let j = 0; j < 4; j++) m[j] += c.perG[j] * c.g;
		return m;
	};
	for (const v of vars) {
		const m = mealVec(v);
		for (let j = 0; j < 4; j++) tot[j] += m[j];
	}

	// Écart à l'objectif pour un repas donné (termes de la journée + rappels de ce créneau).
	const objective = (v: FitVar): number => {
		let obj = 0;
		for (let j = 0; j < 4; j++) if (targets[j] > 0) obj += TARGET_WEIGHTS[j] * (tot[j] / targets[j] - 1) ** 2;
		if (targetKcal > 0) obj += KCAL_WEIGHT * (vecKcal(tot) / targetKcal - 1) ** 2;
		const m = mealVec(v);
		if (v.shareKcal > 0) obj += SHARE_WEIGHT * (vecKcal(m) / v.shareKcal - 1) ** 2;
		if (v.shareProteinG > 0) obj += PROTEIN_SHARE_WEIGHT * (m[0] / v.shareProteinG - 1) ** 2;
		return obj;
	};

	// Minimum de l'objectif le long d'une direction `coef` (macros par unité de la variable), sur [lo, hi].
	const step = (v: FitVar, coef: Vec, current: number, lo: number, hi: number): number => {
		const kcalCoef = vecKcal(coef);
		const m = mealVec(v);
		let num = 0;
		let den = 0;
		for (let j = 0; j < 4; j++) {
			if (targets[j] <= 0) continue;
			const a = coef[j] / targets[j];
			num += TARGET_WEIGHTS[j] * (tot[j] / targets[j] - 1) * a;
			den += TARGET_WEIGHTS[j] * a * a;
		}
		if (targetKcal > 0) {
			const a = kcalCoef / targetKcal;
			num += KCAL_WEIGHT * (vecKcal(tot) / targetKcal - 1) * a;
			den += KCAL_WEIGHT * a * a;
		}
		if (v.shareKcal > 0) {
			const a = kcalCoef / v.shareKcal;
			num += SHARE_WEIGHT * (vecKcal(m) / v.shareKcal - 1) * a;
			den += SHARE_WEIGHT * a * a;
		}
		if (v.shareProteinG > 0) {
			const a = coef[0] / v.shareProteinG;
			num += PROTEIN_SHARE_WEIGHT * (m[0] / v.shareProteinG - 1) * a;
			den += PROTEIN_SHARE_WEIGHT * a * a;
		}
		if (den <= 0) return current;
		return Math.min(hi, Math.max(lo, current - num / den));
	};
	const setS = (v: FitVar, next: number) => {
		const before = dishVec(v, v.s);
		const after = dishVec(v, next);
		for (let j = 0; j < 4; j++) tot[j] += after[j] - before[j];
		v.s = next;
	};
	// Facteur : minimum exact sur chaque segment entre les seuils (pente du plat constante par segment).
	const stepS = (v: FitVar): number => {
		const bounds = [SCALE_MIN, SCALE_MAX];
		for (const f of v.floored) {
			const b = f.floorG / f.q;
			if (f.fixedG == null && b > SCALE_MIN && b < SCALE_MAX) bounds.push(b);
		}
		bounds.sort((a, b) => a - b);
		const start = v.s;
		let best = start;
		let bestObj = objective(v);
		for (let i = 0; i + 1 < bounds.length; i++) {
			const [a, b] = [bounds[i], bounds[i + 1]];
			if (b - a < 1e-9) continue;
			const mid = (a + b) / 2;
			const coef = v.rest.slice() as Vec;
			for (const f of v.floored) {
				if (f.fixedG == null && f.q * mid > f.floorG) for (let j = 0; j < 4; j++) coef[j] += f.perG[j] * f.q;
			}
			setS(v, a);
			const candidate = step(v, coef, a, a, b);
			setS(v, candidate);
			const obj = objective(v);
			if (obj < bestObj - 1e-15) {
				bestObj = obj;
				best = candidate;
			}
		}
		setS(v, best);
		return Math.abs(best - start);
	};
	const setComplement = (c: Complement, next: number) => {
		for (let j = 0; j < 4; j++) tot[j] += c.perG[j] * (next - c.g);
		c.g = next;
	};

	for (let sweep = 0; sweep < sweeps; sweep++) {
		let maxDelta = 0;
		for (const v of vars) {
			if (!v.sFixed) maxDelta = Math.max(maxDelta, stepS(v));
			for (const c of complementsOf(v)) {
				const next = step(v, c.perG, c.g, c.minG, c.maxG);
				maxDelta = Math.max(maxDelta, Math.abs(next - c.g) / 100);
				setComplement(c, next);
			}
		}
		if (maxDelta < 1e-5) break;
	}
}

/**
 * Résolution complète : grammes continus, puis portions cuisinables figées (œufs entiers, compléments
 * féculents absents ou au moins à leur seuil) et nouvel ajustement du reste, qui absorbe l'écart.
 */
function solveCookable(vars: FitVar[], targets: Vec, targetKcal: number, fixed: Vec, sweeps?: number): void {
	solveGroup(vars, targets, targetKcal, fixed, sweeps);
	let changed = false;
	for (const v of vars) {
		for (const f of v.floored) {
			if (!f.isEgg) continue;
			f.fixedG = Math.max(1, Math.round(flooredG(f, v.s) / EGG_UNIT_G)) * EGG_UNIT_G;
			changed = true;
		}
		for (const c of [v.starch, ...v.extras]) {
			if (c.floorG <= 0) continue;
			if (c.g >= c.floorG) c.minG = c.floorG;
			else c.g = c.minG = c.maxG = c.g < c.floorG / 2 ? 0 : c.floorG;
			changed = true;
		}
	}
	if (changed) solveGroup(vars, targets, targetKcal, fixed, sweeps);
}

function toPortion(v: FitVar): MealPortion {
	const quantityG = v.refG * v.s;
	const starchG = Math.round(v.starch.g);
	const extraStarchG = !v.ownStarch && starchG > 0 ? starchG : null;
	const extraStarchIngredientName = extraStarchG != null ? v.starch.name : null;
	const complements = v.extras
		.map((c) => ({ name: c.name, grams: Math.round(c.g) }))
		.filter((c) => c.grams > 0);
	const ingredientGrams = [
		...v.floored.map((f) => ({ name: f.name, grams: Math.round(flooredG(f, v.s)) })),
		...(v.ownStarch ? [{ name: v.starch.name, grams: starchG }] : [])
	];
	return {
		quantityG,
		extraStarchG,
		extraStarchIngredientName,
		complements,
		ingredientGrams,
		...mealMacrosFor(v.meal.recipe, quantityG, extraStarchG, extraStarchIngredientName, complements, ingredientGrams)
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
			const v = buildVar(m, daily.kcal * frac, daily.proteinG * frac);
			solveCookable([v], toVec(daily).map((x) => x * frac) as Vec, daily.kcal * frac, [0, 0, 0, 0], input.sweeps);
			result[k] = toPortion(v);
		}
	});

	if (counted.length > 0) {
		const fixedVec: Vec = input.fixed ? toVec(input.fixed) : [0, 0, 0, 0];
		const fixedKcal = input.fixed ? atwaterKcal(input.fixed) : 0;
		const fracs = counted.map((k) => mealBudgetFraction(meals[k].position, intermittentFasting));
		const fracSum = fracs.reduce((s, f) => s + f, 0);
		const adjustableKcal = Math.max(0, daily.kcal - fixedKcal);
		const adjustableProteinG = Math.max(0, daily.proteinG - fixedVec[0]);
		const vars = counted.map((k, i) =>
			buildVar(meals[k], (adjustableKcal * fracs[i]) / fracSum, (adjustableProteinG * fracs[i]) / fracSum)
		);
		solveCookable(vars, toVec(daily), daily.kcal, fixedVec, input.sweeps);
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
