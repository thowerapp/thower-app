import { describe, expect, it } from 'vitest';
import { RECIPE_CATALOG_DEFS } from '$lib/server/seed/recipeCatalogDefs.js';
import { ingredientFloor, mealBudgetFraction, mealMacrosFor, recipeBaseMacros, recipeParts, starchReferenceFor, type PortionRecipe } from './mealPortion';
import { scaleIngredientNote, scaleQuantitiesInText, wholeEggPortion, withEggCount } from './scaleMealIngredients';

/** Recette catalogue « Penne Complètes au Poulet, Sauce Tomate et Parmesan ». */
const PENNE: PortionRecipe = {
	referenceYieldG: 1000,
	nutritionProteinG: 75,
	nutritionCarbsG: 88,
	nutritionFatG: 48,
	nutritionFiberG: 20,
	ingredients: [
		{ name: 'Filet de poulet en lamelles', quantityG: 160, category: 'Viandes' },
		{ name: 'Penne complètes', quantityG: 65, category: 'Féculents' },
		{ name: 'Skyr nature', quantityG: 250, category: 'Produits frais' },
		{ name: 'Pomme en dés', quantityG: 150, category: 'Fruits' },
		{ name: 'Ail semoule', quantityG: null, category: 'Épices' }
	]
};

describe('mealBudgetFraction', () => {
	it('répartit 20/40/40 sans jeûne et 50/50 avec jeûne', () => {
		expect(mealBudgetFraction('BREAKFAST', false)).toBe(0.2);
		expect(mealBudgetFraction('LUNCH', false)).toBe(0.4);
		expect(mealBudgetFraction('DINNER', true)).toBe(0.5);
	});
});

describe('starchReferenceFor', () => {
	it('reconnaît les féculents du catalogue et ignore le reste', () => {
		for (const name of [
			'Pâtes complètes type Penne',
			'Riz basmati complet',
			'Pommes de terre en dés',
			'Patates douces en dés',
			'Flocons d’avoine intégrale',
			'Nouilles de riz complet',
			'Pain de seigle intégral',
			'Semoule complète',
			'Boulgour'
		]) {
			expect(starchReferenceFor(name), name).not.toBeNull();
		}
		expect(starchReferenceFor('Pomme en dés')).toBeNull();
		expect(starchReferenceFor('Filet de poulet')).toBeNull();
	});
});

describe('ingredientFloor', () => {
	it('donne un seuil et des valeurs à chaque viande, poisson, œuf, oléagineux et féculent du catalogue', () => {
		const floored = ['Viandes', 'Poissons', 'Œufs', 'Oléagineux', 'Féculents'];
		for (const r of RECIPE_CATALOG_DEFS as unknown as PortionRecipe[])
			for (const ing of r.ingredients ?? [])
				if (ing.quantityG && floored.includes(ing.category ?? '')) expect(ingredientFloor(ing), ing.name).not.toBeNull();
	});

	it('applique les seuils de cuisine', () => {
		expect(ingredientFloor({ name: 'Filet de poulet en lamelles', category: 'Viandes' })?.floorG).toBe(70);
		expect(ingredientFloor({ name: 'Tofu ferme', category: 'Légumineuses' })?.floorG).toBe(70);
		expect(ingredientFloor({ name: 'Œufs entiers', category: 'Œufs' })).toMatchObject({ floorG: 55, isEgg: true });
		expect(ingredientFloor({ name: 'Pain de mie complet', category: 'Féculents' })?.floorG).toBe(35);
		expect(ingredientFloor({ name: 'Noix de cajou', category: 'Oléagineux' })?.floorG).toBe(10);
		expect(ingredientFloor({ name: 'Riz complet', category: 'Féculents' })?.floorG).toBe(30);
		expect(ingredientFloor({ name: 'Steak haché 15% MG émietté', category: 'Viandes' })?.per100.fatG).toBe(15);
		expect(ingredientFloor({ name: 'Brocoli', category: 'Légumes' })).toBeNull();
	});
});

describe('recipeParts', () => {
	it('seuil jamais au-dessus de la fiche, reste = fiche − ingrédients à seuil', () => {
		const { parts, rest } = recipeParts(PENNE);
		expect(parts.map((p) => [p.name, p.floorG, p.isBuffer])).toEqual([
			['Filet de poulet en lamelles', 70, false],
			['Penne complètes', 30, true]
		]);
		const base = recipeBaseMacros(PENNE);
		const parts100 = parts.reduce((s, p) => s + (p.per100.proteinG * p.quantityG) / 100, 0);
		expect(rest.proteinG).toBeCloseTo(base.proteinG - parts100, 6);
	});

	it('fiches du catalogue cohérentes avec les valeurs de référence (écart ≤ 6 g par macro)', () => {
		for (const r of RECIPE_CATALOG_DEFS as unknown as PortionRecipe[]) {
			const { parts } = recipeParts(r);
			const base = recipeBaseMacros(r);
			for (const key of ['proteinG', 'carbsG', 'fatG'] as const) {
				const partsG = parts.reduce((s, p) => s + (p.per100[key] * p.quantityG) / 100, 0);
				expect(partsG, `${(r as { name?: string }).name} ${key}`).toBeLessThanOrEqual(base[key] + 6);
			}
		}
	});
});

describe('mealMacrosFor', () => {
	it('additionne la recette et le féculent ajouté', () => {
		const m = mealMacrosFor(PENNE, 1000, 100, 'Penne complètes');
		expect(m.calcProteinG).toBeCloseTo(88, 6);
		expect(m.calcCarbsG).toBeCloseTo(152, 6);
	});

	it('compte les ingrédients à grammes fixés à leurs grammes et le reste au facteur', () => {
		const half = mealMacrosFor(PENNE, 500);
		const withFloor = mealMacrosFor(PENNE, 500, null, null, null, [{ name: 'Filet de poulet en lamelles', grams: 100 }]);
		// 100 g de poulet au lieu de 80 g (160 × 0,5) : + 20 g × 23,5 % de protéines.
		expect(withFloor.calcProteinG! - half.calcProteinG!).toBeCloseTo(20 * 0.235, 6);
	});

	it('renvoie null pour une recette sans macros', () => {
		const m = mealMacrosFor({ referenceYieldG: 100, nutritionProteinG: null, nutritionCarbsG: null, nutritionFatG: null, nutritionFiberG: null }, 100);
		expect(m.calcCalories).toBeNull();
	});
});

describe('scaleQuantitiesInText', () => {
	it('met à l’échelle les grammages de la note', () => {
		expect(scaleQuantitiesInText('50g plat + 200g dessert', 0.873)).toBe('44 g plat + 175 g dessert');
		expect(scaleQuantitiesInText('poids cru', 1.2)).toBe('poids cru');
	});

	it('recalcule le nombre d’œufs à l’œuf entier', () => {
		expect(scaleQuantitiesInText('3 œufs', 1.42)).toBe('4 œufs');
		expect(scaleQuantitiesInText('2 œufs bio ou plein air', 0.4)).toBe('1 œuf bio ou plein air');
		expect(scaleQuantitiesInText('1 œuf', 1.6)).toBe('2 œufs');
	});

	it('met à l’échelle les instructions', () => {
		expect(
			scaleQuantitiesInText('Cuire les 3 œufs durs 9 minutes. Ajouter les 50g de Skyr.', 1.42)
		).toBe('Cuire les 4 œufs durs 9 minutes. Ajouter les 71 g de Skyr.');
	});
});

describe('scaleIngredientNote', () => {
	it('recalcule le nombre d’unités en tête de note', () => {
		expect(scaleIngredientNote('2 bananes - dessert', 0.4875)).toBe('1 banane - dessert');
		expect(scaleIngredientNote('4 tranches', 1.5)).toBe('6 tranches');
		expect(scaleIngredientNote('1 petit avocat (chair)', 1.2)).toBe('1 petit avocat (chair)');
		expect(scaleIngredientNote('2 œufs mollets', 0.4875)).toBe('1 œuf mollets');
		expect(scaleIngredientNote('50g plat + 200g dessert', 1.3)).toBe('65 g plat + 260 g dessert');
		expect(scaleIngredientNote('dessert', 0.5)).toBe('dessert');
	});
});

describe('wholeEggPortion', () => {
	it('sert les œufs entiers (55 g), au moins un', () => {
		expect(wholeEggPortion('Œuf entier', 27.7)).toEqual({ count: 1, grams: 55 });
		expect(wholeEggPortion('Œufs entiers', 120)).toEqual({ count: 2, grams: 110 });
		expect(wholeEggPortion('Œufs entiers (plat principal)', 255.6)).toEqual({ count: 5, grams: 275 });
		expect(wholeEggPortion('Bœuf haché 5% MG', 150)).toBeNull();
		expect(wholeEggPortion('Œuf entier', null)).toBeNull();
	});

	it('aligne le nombre d’œufs de la note', () => {
		expect(withEggCount('2 œufs mollets', 1)).toBe('1 œuf mollets');
		expect(withEggCount('1 œuf', 3)).toBe('3 œufs');
	});
});
