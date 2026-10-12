import { describe, expect, it } from 'vitest';
import { breadGramsPerDayField, breadMacrosForGrams, breadTypeField, breadTypeOptions } from './breadType';

describe('breadMacrosForGrams', () => {
	it('proportionne l’apport du pain à la quantité', () => {
		const hundred = breadMacrosForGrams('MULTIGRAIN', 100);
		expect(hundred).toEqual({ kcal: 285, proteinG: 10, carbsG: 45, fatG: 5.5, fiberG: 6.5 });
		expect(breadMacrosForGrams('MULTIGRAIN', 50).kcal).toBeCloseTo(142.5);
		expect(breadMacrosForGrams('MULTIGRAIN', 0).kcal).toBe(0);
	});

	it('propose chaque type avec son libellé', () => {
		expect(breadTypeOptions.length).toBeGreaterThan(0);
		expect(breadTypeOptions.every((o) => o.label.length > 0)).toBe(true);
	});
});

describe('champs de formulaire du pain', () => {
	it('lisent les grammes (vide = absent, bornes 0 à 2000) et le type (vide = absent)', () => {
		expect(breadGramsPerDayField.parse('')).toBeUndefined();
		expect(breadGramsPerDayField.parse(null)).toBeUndefined();
		expect(breadGramsPerDayField.parse('150')).toBe(150);
		expect(breadGramsPerDayField.safeParse('2001').success).toBe(false);
		expect(breadTypeField.parse('')).toBeUndefined();
		expect(breadTypeField.parse('MULTIGRAIN')).toBe('MULTIGRAIN');
		expect(breadTypeField.safeParse('inconnu').success).toBe(false);
	});
});
