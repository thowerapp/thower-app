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
import { scaleGramsInNote, scaledIngredientGrams } from './scaleMealIngredients';

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
	it('atteint protéines et kcal du créneau en complétant avec le féculent', () => {
		const p = computeMealPortion(PENNE, CLIENT_SLOT);
		expect(p.calcProteinG).toBeGreaterThan(81.9 * 0.97);
		expect(p.calcCalories).toBeGreaterThan(1732 * 0.98);
		expect(p.calcCalories).toBeLessThan(1732 * 1.02);
		expect(p.extraStarchIngredientName).toBe('Penne complètes');
		expect(p.extraStarchG).toBeGreaterThan(0);
		expect(scaledIngredientGrams(65, p.quantityG, 1000)! + p.extraStarchG!).toBeLessThanOrEqual(MAX_STARCH_G_DRY + 0.5);
	});

	it('affiche des kcal toujours égales à 4P + 4G + 9L + 2 fibres', () => {
		const p = computeMealPortion(PENNE, CLIENT_SLOT);
		expect(p.calcCalories).toBeCloseTo(totalKcal(p), 6);
	});

	it('monte le facteur recette quand aucun féculent n’est disponible', () => {
		const noStarch = { ...PENNE, ingredients: PENNE.ingredients!.filter((i) => i.category !== 'Féculents') };
		const p = computeMealPortion(noStarch, CLIENT_SLOT);
		expect(p.extraStarchG).toBeNull();
		expect(p.calcCalories).toBeCloseTo(1732, 0);
		expect(p.calcProteinG!).toBeGreaterThan(81.9);
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

	it('monte le féculent à ~130-150 g cru sur le cas client', () => {
		const p = computeMealPortion(PENNE, CLIENT_SLOT);
		const totalStarch = scaledIngredientGrams(65, p.quantityG, 1000)! + p.extraStarchG!;
		expect(totalStarch).toBeGreaterThan(130);
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

describe('scaleGramsInNote', () => {
	it('met à l’échelle les grammages de la note', () => {
		expect(scaleGramsInNote('50g plat + 200g dessert', 0.873)).toBe('44 g plat + 175 g dessert');
		expect(scaleGramsInNote('poids cru', 1.2)).toBe('poids cru');
	});
});
