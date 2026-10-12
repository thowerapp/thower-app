import { describe, expect, it } from 'vitest';
import { allergenLabels, normalizeAllergen, normalizeAllergens } from './allergens';
import { recipeConflictsUser } from '$lib/server/program-generation/nutrition/recipeFilterUtils';

describe('normalizeAllergen', () => {
	it('garde les codes français et convertit les codes anglais du catalogue d’origine', () => {
		expect(normalizeAllergen('oeufs')).toBe('oeufs');
		expect(normalizeAllergen('eggs')).toBe('oeufs');
		expect(normalizeAllergen('Milk')).toBe('lait');
		expect(normalizeAllergen('nuts')).toBe('fruits_a_coque');
		expect(normalizeAllergen('peanuts')).toBe('arachides');
		expect(normalizeAllergen('shellfish')).toBe('crustaces');
		expect(normalizeAllergen('soy')).toBe('soja');
		expect(normalizeAllergen('seeds')).toBeNull();
	});

	it('déduplique et donne les libellés français', () => {
		expect(normalizeAllergens(['eggs', 'oeufs', 'seeds', 'gluten'])).toEqual(['oeufs', 'gluten']);
		expect(allergenLabels(['milk', 'fish'])).toEqual(['Lait', 'Poisson']);
	});
});

describe('recipeConflictsUser', () => {
	const recipe = { name: 'Omelette', allergens: ['eggs', 'milk'], ingredients: [{ name: 'Œufs entiers' }] };

	it('exclut une recette codée en anglais pour une allergie déclarée en français', () => {
		expect(recipeConflictsUser(recipe, ['oeufs'], [])).toBe(true);
		expect(recipeConflictsUser(recipe, ['lait'], [])).toBe(true);
		expect(recipeConflictsUser(recipe, ['poisson'], [])).toBe(false);
	});
});
