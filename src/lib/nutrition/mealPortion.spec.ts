import { describe, expect, it } from 'vitest';
import {
	MAX_STARCH_G_DRY,
	atwaterKcal,
	computeMealPortion,
	mealBudgetFraction,
	mealMacrosFor,
	mealSlotTargets,
	starchReferenceFor,
	type PortionRecipe
} from './mealPortion';
import { scaleQuantitiesInText, scaledIngredientGrams } from './scaleMealIngredients';

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

/** Recette catalogue « Double Club Sandwich Thon-Avocat-Œufs » (avant correction du Skyr, cas du bilan du 2026-10-07). */
const CLUB_SANDWICH: PortionRecipe = {
	referenceYieldG: 870,
	nutritionProteinG: 75,
	nutritionCarbsG: 85,
	nutritionFatG: 58,
	nutritionFiberG: 22,
	ingredients: [
		{ name: 'Thon au naturel en boîte', quantityG: 140, category: 'Poissons' },
		{ name: 'Œufs entiers', quantityG: 180, category: 'Œufs' },
		{ name: 'Pain de mie complet', quantityG: 140, category: 'Féculents' },
		{ name: 'Avocat entier', quantityG: 150, category: 'Fruits' },
		{ name: 'Skyr nature', quantityG: 250, category: 'Produits frais' }
	]
};

/** Cas client : budget 3464 kcal, 163,8 g de protéines, jeûne (déjeuner + dîner à 50 %). */
const CLIENT_SLOT = mealSlotTargets('LUNCH', true, 3464, 163.8);

function totalKcal(m: { calcProteinG: number | null; calcCarbsG: number | null; calcFatG: number | null; calcFiberG: number | null }) {
	return atwaterKcal({
		proteinG: m.calcProteinG ?? 0,
		carbsG: m.calcCarbsG ?? 0,
		fatG: m.calcFatG ?? 0,
		fiberG: m.calcFiberG ?? 0
	});
}

describe('mealSlotTargets', () => {
	it('répartit 30/35/35 sans jeûne et 50/50 avec jeûne', () => {
		expect(mealBudgetFraction('BREAKFAST', false)).toBe(0.3);
		expect(mealBudgetFraction('LUNCH', false)).toBe(0.35);
		expect(mealBudgetFraction('DINNER', true)).toBe(0.5);
		expect(CLIENT_SLOT).toEqual({ kcal: 1732, proteinG: 81.9 });
	});
});

describe('computeMealPortion', () => {
	it('atteint les protéines du créneau en complétant avec le féculent, sans dépasser les kcal', () => {
		const p = computeMealPortion(PENNE, CLIENT_SLOT);
		expect(p.calcProteinG).toBeGreaterThan(81.9 * 0.98);
		expect(p.calcProteinG).toBeLessThanOrEqual(81.9);
		expect(p.calcCalories).toBeLessThanOrEqual(1732);
		expect(p.extraStarchIngredientName).toBe('Penne complètes');
		expect(p.extraStarchG).toBeGreaterThan(0);
		expect(scaledIngredientGrams(65, p.quantityG, 1000)! + p.extraStarchG!).toBeLessThanOrEqual(MAX_STARCH_G_DRY);
	});

	it('affiche des kcal toujours égales à 4P + 4G + 9L + 2 fibres', () => {
		const p = computeMealPortion(PENNE, CLIENT_SLOT);
		expect(p.calcCalories).toBeCloseTo(totalKcal(p), 6);
	});

	it('ne dépasse pas la cible protéines quand aucun féculent n’est disponible', () => {
		const noStarch = { ...PENNE, ingredients: PENNE.ingredients!.filter((i) => i.category !== 'Féculents') };
		const p = computeMealPortion(noStarch, CLIENT_SLOT);
		expect(p.extraStarchG).toBeNull();
		expect(p.calcProteinG).toBeCloseTo(81.9, 6);
		expect(p.calcCalories!).toBeLessThan(1732);
	});

	it('ne dépasse ni les kcal ni les protéines sur le Club Sandwich (féculent de la recette au-delà de l’ancien plafond)', () => {
		const p = computeMealPortion(CLUB_SANDWICH, { kcal: 1588, proteinG: 82.7 });
		expect(p.calcCalories!).toBeLessThanOrEqual(1588);
		expect(p.calcProteinG!).toBeLessThanOrEqual(82.7);
		expect(p.calcProteinG!).toBeGreaterThan(82.7 * 0.98);
		const totalStarch = scaledIngredientGrams(140, p.quantityG, 870)! + (p.extraStarchG ?? 0);
		expect(totalStarch).toBeLessThanOrEqual(MAX_STARCH_G_DRY);
	});

	it('se cale sur les kcal quand la recette est moins protéinée que la cible', () => {
		const p = computeMealPortion(PENNE, { kcal: 600, proteinG: 80 });
		expect(p.extraStarchG).toBeNull();
		expect(p.calcCalories).toBeCloseTo(600, 0);
	});

	it('garde la portion de référence sans cibles', () => {
		const p = computeMealPortion(PENNE, { kcal: null, proteinG: null });
		expect(p.quantityG).toBe(1000);
		expect(p.calcProteinG).toBe(75);
	});

	it('monte le féculent jusqu’au plafond de 250 g cru sur le cas client', () => {
		const p = computeMealPortion(PENNE, CLIENT_SLOT);
		const totalStarch = scaledIngredientGrams(65, p.quantityG, 1000)! + p.extraStarchG!;
		expect(totalStarch).toBeGreaterThan(MAX_STARCH_G_DRY - 1);
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
