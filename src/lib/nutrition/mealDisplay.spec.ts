import { describe, expect, it } from 'vitest';
import { defaultTimeLabel, mealMacrosRounded, positionLabel, positionOrder } from './mealDisplay';

const calc = {
	isManual: false,
	manualCalories: 999,
	manualProteinG: 99,
	manualCarbsG: 99,
	manualFatG: 99,
	manualFiberG: 99,
	calcCalories: 512.6,
	calcProteinG: 30.04,
	calcCarbsG: 55.55,
	calcFatG: 12.349,
	calcFiberG: null
};

describe('mealDisplay', () => {
	it('ordonne les repas dans la journée', () => {
		const sorted = (['DINNER', 'BREAKFAST', 'LUNCH'] as const).toSorted((a, b) => positionOrder(a) - positionOrder(b));
		expect(sorted).toEqual(['BREAKFAST', 'LUNCH', 'DINNER']);
	});

	it('donne un libellé et une heure par créneau', () => {
		expect(positionLabel('LUNCH')).toBe('Déjeuner');
		expect(defaultTimeLabel('DINNER')).toBe('19h00');
	});

	it('affiche les valeurs calculées arrondies', () => {
		expect(mealMacrosRounded(calc)).toEqual({
			calories: 513,
			proteinG: 30,
			carbsG: 55.6,
			fatG: 12.3,
			fiberG: 0
		});
	});

	it('préfère la saisie manuelle quand elle existe', () => {
		expect(mealMacrosRounded({ ...calc, isManual: true, manualFiberG: null })).toEqual({
			calories: 999,
			proteinG: 99,
			carbsG: 99,
			fatG: 99,
			fiberG: 0
		});
	});
});
