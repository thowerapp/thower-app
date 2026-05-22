import { describe, expect, it } from 'vitest';
import { parseShoppingItemSources } from './types';

describe('parseShoppingItemSources', () => {
	it('parse un tableau JSON valide', () => {
		expect(
			parseShoppingItemSources([
				{ recipeName: 'Tajine', quantityG: 120 },
				{ recipeName: 'Salade', quantityG: 40.5 }
			])
		).toEqual([
			{ recipeName: 'Tajine', quantityG: 120 },
			{ recipeName: 'Salade', quantityG: 40.5 }
		]);
	});

	it('ignore les entrées invalides', () => {
		expect(
			parseShoppingItemSources([
				{ recipeName: '', quantityG: 10 },
				{ recipeName: 'OK', quantityG: -1 },
				{ recipeName: 'OK', quantityG: 0 },
				null,
				{ foo: 'bar' }
			])
		).toEqual([]);
	});

	it('retourne [] si absent ou non-tableau', () => {
		expect(parseShoppingItemSources(undefined)).toEqual([]);
		expect(parseShoppingItemSources(null)).toEqual([]);
		expect(parseShoppingItemSources({})).toEqual([]);
	});
});
