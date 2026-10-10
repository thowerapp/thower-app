import { describe, expect, it } from 'vitest';
import { RECIPE_CATALOG_DEFS } from '$lib/server/seed/recipeCatalogDefs.js';
import {
	MEAL_COMPLEMENTS,
	MAX_STARCH_G_DRY,
	MAX_STARCH_G_FRESH,
	atwaterKcal,
	complementReferenceFor,
	findStarchIngredient,
	ingredientFloor,
	recipeParts,
	type PortionRecipe
} from './mealPortion';
import { EGG_UNIT_G, mealIngredientGrams } from './scaleMealIngredients';
import { dailyMealTargets, type MealMacroTargets } from './nutritionTargets';
import { dayDeviationScore, fitDay, isCountedMeal, pickDayRecipes, type PlannerMeal } from './dayPlanner';

type CatalogRecipe = PortionRecipe & {
	id: string;
	name: string;
	category: string;
	ingredients: { name: string; quantityG: number | null; category: string | null }[];
};
const CATALOG: CatalogRecipe[] = (RECIPE_CATALOG_DEFS as unknown as Omit<CatalogRecipe, 'id'>[]).map((r, i) => ({
	...r,
	id: `r${i}`
}));
const POOLS = {
	BREAKFAST: CATALOG.filter((r) => r.category === 'BREAKFAST'),
	MEAL: CATALOG.filter((r) => r.category === 'MEAL')
};
const byName = (prefix: string) => CATALOG.find((r) => r.name.startsWith(prefix))!;

/** Profil client (fiche MT) : 93,7 kg, 12,6 % MG, Athlète. */
const CLIENT = dailyMealTargets({ weightKg: 93.7, bodyFatPercent: 12.6, activityLevel: 'ATHLETE' })!;
const PROFILES = [
	{ label: 'client athlète en jeûne (2 repas)', daily: CLIENT, fasting: true },
	{ label: 'client athlète (3 repas)', daily: CLIENT, fasting: false },
	{ label: 'actif 75 kg (3 repas)', daily: dailyMealTargets({ weightKg: 75, bodyFatPercent: 20, activityLevel: 'ACTIVE' })!, fasting: false },
	{ label: 'sédentaire 58 kg (3 repas)', daily: dailyMealTargets({ weightKg: 58, bodyFatPercent: 28, activityLevel: 'SEDENTARY' })!, fasting: false }
];

/** Générateur pseudo-aléatoire reproductible. */
function seeded(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function dayTotals(meals: PlannerMeal[], daily: MealMacroTargets, fasting: boolean) {
	const portions = fitDay({ meals, daily, intermittentFasting: fasting });
	const tot = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 };
	portions.forEach((p, k) => {
		if (!isCountedMeal(meals[k].position, fasting)) return;
		tot.kcal += p.calcCalories ?? 0;
		tot.proteinG += p.calcProteinG ?? 0;
		tot.carbsG += p.calcCarbsG ?? 0;
		tot.fatG += p.calcFatG ?? 0;
		tot.fiberG += p.calcFiberG ?? 0;
	});
	return { portions, tot };
}

/** 91 jours générés comme en production : choix des recettes puis ajustement de la journée. */
function generate91(daily: MealMacroTargets, fasting: boolean) {
	const random = seeded(7);
	const days: { meals: PlannerMeal[]; ids: string[] }[] = [];
	for (let d = 0; d < 91; d++) {
		const recent = new Set(days.slice(-3).flatMap((x) => x.ids));
		const picks = pickDayRecipes({
			positionsToFill: ['BREAKFAST', 'LUNCH', 'DINNER'],
			existing: [],
			pools: POOLS,
			daily,
			intermittentFasting: fasting,
			recentRecipeIds: recent,
			random
		});
		const meals = [...picks].map(([position, recipe]) => ({ position, recipe }));
		days.push({ meals, ids: [...picks.values()].map((r) => r.id) });
	}
	return days;
}

describe('dailyMealTargets', () => {
	it('reprend les formules du profil et retombe sur les kcal (4 P + 4 G + 9 L + 2 fibres)', () => {
		expect(CLIENT.kcal).toBe(3176);
		expect(CLIENT.proteinG).toBeCloseTo(93.7 * (1 - 0.126) * 2, 6);
		expect(CLIENT.fatG).toBeCloseTo(93.7 * 0.8, 6);
		expect(CLIENT.fiberG).toBeCloseTo(3176 * 0.015, 6);
		expect(atwaterKcal(CLIENT)).toBeCloseTo(CLIENT.kcal, 6);
	});

	it('déduit le pain quotidien de chaque macro', () => {
		const bread = { kcal: 245, proteinG: 9, carbsG: 45, fatG: 2, fiberG: 7 };
		const t = dailyMealTargets({ weightKg: 93.7, bodyFatPercent: 12.6, activityLevel: 'ATHLETE', bread })!;
		expect(t.kcal).toBe(CLIENT.kcal - 245);
		expect(t.proteinG).toBeCloseTo(CLIENT.proteinG - 9, 6);
		expect(t.fatG).toBeCloseTo(CLIENT.fatG - 2, 6);
		expect(t.fiberG).toBeCloseTo(CLIENT.fiberG - 7, 6);
	});

	it('renvoie null sans poids ni % MG', () => {
		expect(dailyMealTargets({ weightKg: null, bodyFatPercent: 15 })).toBeNull();
		expect(dailyMealTargets({ weightKg: 80, bodyFatPercent: null })).toBeNull();
	});
});

describe('génération 91 jours × profils (macros des fiches admin)', () => {
	for (const profile of PROFILES) {
		describe(profile.label, () => {
			const days = generate91(profile.daily, profile.fasting);
			const results = days.map((d) => ({ ...d, ...dayTotals(d.meals, profile.daily, profile.fasting) }));
			const rel = (key: keyof MealMacroTargets) =>
				results.map((r) => r.tot[key] / profile.daily[key] - 1);
			const mean = (xs: number[]) => xs.reduce((s, x) => s + Math.abs(x), 0) / xs.length;
			const worst = (xs: number[]) => Math.max(...xs.map(Math.abs));

			it('totaux du jour au plus près des cibles', () => {
				expect(mean(rel('kcal'))).toBeLessThan(0.005);
				expect(mean(rel('proteinG'))).toBeLessThan(0.01);
				expect(mean(rel('carbsG'))).toBeLessThan(0.01);
				expect(mean(rel('fatG'))).toBeLessThan(0.01);
				expect(worst(rel('kcal'))).toBeLessThan(0.01);
				expect(worst(rel('proteinG'))).toBeLessThan(0.03);
				expect(worst(rel('carbsG'))).toBeLessThan(0.03);
			});

			it('protéines réparties selon les créneaux (déjeuner ≈ dîner)', () => {
				for (const r of results) {
					const byPos = new Map(r.meals.map((m, k) => [m.position, r.portions[k].calcProteinG!]));
					const ratio = byPos.get('LUNCH')! / byPos.get('DINNER')!;
					expect(ratio).toBeGreaterThan(0.9);
					expect(ratio).toBeLessThan(1.1);
				}
			});

			it('kcal réparties selon les créneaux (20/40/40 à 3 repas, 50/50 en jeûne)', () => {
				for (const r of results)
					r.portions.forEach((p, k) => {
						const position = r.meals[k].position;
						if (!isCountedMeal(position, profile.fasting)) return;
						const expected = position === 'BREAKFAST' ? 0.2 : profile.fasting ? 0.5 : 0.4;
						expect(Math.abs(p.calcCalories! / r.tot.kcal - expected)).toBeLessThan(0.05);
					});
			});

			it('compléments sous leur plafond', () => {
				for (const r of results)
					for (const p of r.portions)
						for (const c of p.complements)
							expect(c.grams).toBeLessThanOrEqual(MEAL_COMPLEMENTS.find((x) => x.name === c.name)!.maxG + 0.5);
			});

			it('kcal de chaque repas = 4 P + 4 G + 9 L + 2 fibres', () => {
				for (const r of results)
					for (const p of r.portions)
						expect(p.calcCalories).toBeCloseTo(
							atwaterKcal({ proteinG: p.calcProteinG!, carbsG: p.calcCarbsG!, fatG: p.calcFatG!, fiberG: p.calcFiberG! }),
							6
						);
			});

			it('aucune recette reprise sur 3 jours ni deux fois dans la journée', () => {
				days.forEach((d, i) => {
					expect(new Set(d.ids).size).toBe(d.ids.length);
					const recent = new Set(days.slice(Math.max(0, i - 3), i).flatMap((x) => x.ids));
					for (const id of d.ids) expect(recent.has(id)).toBe(false);
				});
			});

			it('féculents de chaque repas sous le plafond (recette + complément)', () => {
				for (const r of results)
					r.portions.forEach((p, k) => {
						const recipe = r.meals[k].recipe;
						const own = findStarchIngredient(recipe);
						const ownG = own ? mealIngredientGrams(own, p, recipe.referenceYieldG)! : 0;
						expect(ownG + (p.extraStarchG ?? 0)).toBeLessThanOrEqual(MAX_STARCH_G_FRESH + 1);
						if (own && own.per100.carbsG > 30) expect(ownG + (p.extraStarchG ?? 0)).toBeLessThanOrEqual(MAX_STARCH_G_DRY + 1);
					});
			});

			it('portions cuisinables : ingrédients au-dessus de leur seuil, œufs entiers, féculents ajoutés ≥ 30 g', () => {
				for (const r of results)
					r.portions.forEach((p, k) => {
						const recipe = r.meals[k].recipe;
						for (const ing of recipe.ingredients ?? []) {
							const floor = ingredientFloor(ing);
							if (!floor || !ing.quantityG) continue;
							const grams = mealIngredientGrams(ing, p, recipe.referenceYieldG)!;
							expect(grams, ing.name).toBeGreaterThanOrEqual(Math.min(floor.floorG, ing.quantityG) - 0.5);
							if (floor.isEgg) expect(grams % EGG_UNIT_G, ing.name).toBe(0);
						}
						for (const c of [...p.complements, { name: p.extraStarchIngredientName ?? '', grams: p.extraStarchG ?? 0 }])
							if (c.name === 'Flocons d’avoine' || c.name === 'Riz complet')
								expect(c.grams === 0 || c.grams >= 30, `${c.name} ${c.grams} g`).toBe(true);
					});
			});

			it('repas équilibrés entre eux (part de chaque repas proche de son créneau)', () => {
				for (const r of results) {
					const counted = r.portions.filter((_, k) => isCountedMeal(r.meals[k].position, profile.fasting));
					for (const p of counted) {
						const share = p.calcCalories! / r.tot.kcal;
						expect(share).toBeGreaterThan(0.15);
						expect(share).toBeLessThan(0.6);
					}
				}
			});
		});
	}
});

describe('fitDay', () => {
	const lunch = byName('Émincé de Dinde Oriental');
	const dinner = byName('Double Club Sandwich');

	it('garde les recettes de l’admin : reste de la fiche au facteur, ingrédients à seuil à leurs grammes, compléments', () => {
		const [p] = fitDay({ meals: [{ position: 'LUNCH', recipe: lunch }], daily: CLIENT, intermittentFasting: true });
		const factor = p.quantityG / lunch.referenceYieldG!;
		const { parts, rest } = recipeParts(lunch);
		expect(p.ingredientGrams.map((i) => i.name).sort()).toEqual(parts.map((x) => x.name).sort());
		const added = [
			{ name: p.extraStarchIngredientName, grams: p.extraStarchG ?? 0 },
			...p.complements
		].filter((c): c is { name: string; grams: number } => c.name != null && c.grams > 0);
		const expected = (key: 'proteinG' | 'fatG') =>
			rest[key] * factor +
			parts.reduce((s, x) => s + (x.per100[key] * p.ingredientGrams.find((i) => i.name === x.name)!.grams) / 100, 0) +
			added.reduce((s, c) => s + (complementReferenceFor(c.name)![key] * c.grams) / 100, 0);
		expect(p.calcProteinG).toBeCloseTo(expected('proteinG'), 6);
		expect(p.calcFatG).toBeCloseTo(expected('fatG'), 6);
	});

	it('petit gabarit : la viande reste à 70 g et le féculent tampon absorbe le solde', () => {
		const light = dailyMealTargets({ weightKg: 58, bodyFatPercent: 28, activityLevel: 'SEDENTARY' })!;
		const [p] = fitDay({ meals: [{ position: 'LUNCH', recipe: lunch }, { position: 'DINNER', recipe: dinner }], daily: light, intermittentFasting: true });
		const meat = lunch.ingredients.find((i) => i.category === 'Viandes')!;
		const starch = findStarchIngredient(lunch)!;
		const factor = p.quantityG / lunch.referenceYieldG!;
		expect(mealIngredientGrams(meat, p, lunch.referenceYieldG)).toBeGreaterThanOrEqual(Math.min(70, meat.quantityG!));
		// Le féculent ne suit pas le facteur du plat.
		expect(Math.abs(mealIngredientGrams(starch, p, lunch.referenceYieldG)! - starch.quantityG * factor)).toBeGreaterThan(1);
	});

	it('sert du riz complet en complément quand la recette n’a pas de féculent', () => {
		const salmon = byName('Pavé de Saumon aux Lentilles');
		expect(findStarchIngredient(salmon)).toBeNull();
		const [p] = fitDay({ meals: [{ position: 'DINNER', recipe: salmon }, { position: 'LUNCH', recipe: lunch }], daily: CLIENT, intermittentFasting: true });
		expect(p.extraStarchIngredientName).toBe('Riz complet');
		expect(p.extraStarchG).toBeGreaterThan(0);
	});

	it('jeûne : p’tit déj hors total, ajusté seul sur ses 20 %', () => {
		const breakfast = POOLS.BREAKFAST[0];
		const meals = [
			{ position: 'BREAKFAST', recipe: breakfast },
			{ position: 'LUNCH', recipe: lunch },
			{ position: 'DINNER', recipe: dinner }
		];
		const withBreakfast = fitDay({ meals, daily: CLIENT, intermittentFasting: true });
		const without = fitDay({ meals: meals.slice(1), daily: CLIENT, intermittentFasting: true });
		expect(withBreakfast[1].calcCalories).toBeCloseTo(without[0].calcCalories!, 3);
		expect(withBreakfast[0].calcCalories! / (CLIENT.kcal * 0.2)).toBeGreaterThan(0.85);
		expect(withBreakfast[0].calcCalories! / (CLIENT.kcal * 0.2)).toBeLessThan(1.15);
	});

	it('repas manuel ou mangé : son apport est déduit, les autres repas complètent la journée', () => {
		// Déjeuner déjà mangé : la moitié de la journée.
		const fixed = { proteinG: CLIENT.proteinG / 2, carbsG: CLIENT.carbsG / 2, fatG: CLIENT.fatG / 2, fiberG: CLIENT.fiberG / 2 };
		const [p] = fitDay({ meals: [{ position: 'DINNER', recipe: lunch }], daily: CLIENT, intermittentFasting: true, fixed });
		expect(p.calcProteinG! + fixed.proteinG).toBeGreaterThan(CLIENT.proteinG * 0.95);
		expect(p.calcProteinG! + fixed.proteinG).toBeLessThan(CLIENT.proteinG * 1.05);
	});

	it('quantité imposée au curseur : le repas la garde, l’autre repas compense', () => {
		const free = fitDay({ meals: [{ position: 'LUNCH', recipe: lunch }, { position: 'DINNER', recipe: dinner }], daily: CLIENT, intermittentFasting: true });
		const forced = fitDay({
			meals: [{ position: 'LUNCH', recipe: lunch, fixedQuantityG: 400 }, { position: 'DINNER', recipe: dinner }],
			daily: CLIENT,
			intermittentFasting: true
		});
		expect(forced[0].quantityG).toBe(400);
		expect(forced[1].quantityG).toBeGreaterThan(free[1].quantityG);
	});

	it('journée du bilan Gemini (Banane-Chocolat + Satay, jeûne) : cibles atteintes, protéines 50/50, riz ≤ 160 g cru', () => {
		const meals = [
			{ position: 'LUNCH', recipe: byName('Sauté de Poulet cacahuètes, Chou-Fleur') },
			{ position: 'DINNER', recipe: byName('Sauté de Poulet Satay') }
		];
		const { portions, tot } = dayTotals(meals, CLIENT, true);
		expect(Math.abs(tot.kcal / CLIENT.kcal - 1)).toBeLessThan(0.01);
		expect(Math.abs(tot.proteinG / CLIENT.proteinG - 1)).toBeLessThan(0.02);
		expect(Math.abs(tot.carbsG / CLIENT.carbsG - 1)).toBeLessThan(0.03);
		expect(Math.abs(tot.fatG / CLIENT.fatG - 1)).toBeLessThan(0.03);
		expect(portions[0].calcProteinG! / portions[1].calcProteinG!).toBeGreaterThan(0.9);
		expect(portions[0].calcProteinG! / portions[1].calcProteinG!).toBeLessThan(1.1);
		const lunchRecipe = meals[0].recipe;
		const riceG = (35 * portions[0].quantityG) / lunchRecipe.referenceYieldG! + (portions[0].extraStarchG ?? 0);
		expect(riceG).toBeLessThanOrEqual(MAX_STARCH_G_DRY + 1);
	});

	it('sans cibles : portions de référence', () => {
		const [p] = fitDay({ meals: [{ position: 'LUNCH', recipe: lunch }], daily: null, intermittentFasting: false });
		expect(p.quantityG).toBe(lunch.referenceYieldG);
		expect(p.extraStarchG).toBeNull();
		expect(p.complements).toEqual([]);
	});

	it('meilleure association = écart plus faible qu’une association tirée au hasard', () => {
		const random = seeded(3);
		const picks = pickDayRecipes({
			positionsToFill: ['LUNCH', 'DINNER'],
			existing: [],
			pools: POOLS,
			daily: CLIENT,
			intermittentFasting: true,
			recentRecipeIds: new Set(),
			random
		});
		const meals = [...picks].map(([position, recipe]) => ({ position, recipe }));
		const score = dayDeviationScore(fitDay({ meals, daily: CLIENT, intermittentFasting: true }), meals, CLIENT, true);
		const naive = [{ position: 'LUNCH', recipe: byName('Pavé de Saumon') }, { position: 'DINNER', recipe: byName('Grande Omelette') }];
		const naiveScore = dayDeviationScore(fitDay({ meals: naive, daily: CLIENT, intermittentFasting: true }), naive, CLIENT, true);
		expect(score).toBeLessThan(naiveScore);
	});
});
