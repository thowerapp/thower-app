import { describe, expect, it } from 'vitest';
import { mealBudgetFraction, mealMacrosFor, starchReferenceFor, type PortionRecipe } from './mealPortion';
import { scaleQuantitiesInText } from './scaleMealIngredients';

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
	it('répartit 30/35/35 sans jeûne et 50/50 avec jeûne', () => {
		expect(mealBudgetFraction('BREAKFAST', false)).toBe(0.3);
		expect(mealBudgetFraction('LUNCH', false)).toBe(0.35);
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

describe('mealMacrosFor', () => {
	it('additionne la recette et le féculent ajouté', () => {
		const m = mealMacrosFor(PENNE, 1000, 100, 'Penne complètes');
		expect(m.calcProteinG).toBeCloseTo(88, 6);
		expect(m.calcCarbsG).toBeCloseTo(152, 6);
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
