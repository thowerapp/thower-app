import { describe, expect, it } from 'vitest';
import { normalizeStringList } from './normalizeStringList';

describe('normalizeStringList', () => {
	it('renvoie une liste vide pour une valeur absente ou vide', () => {
		expect(normalizeStringList(undefined)).toEqual([]);
		expect(normalizeStringList(null)).toEqual([]);
		expect(normalizeStringList('   ')).toEqual([]);
		expect(normalizeStringList(42)).toEqual([]);
	});

	it('garde une chaîne simple et un tableau propre, sans doublon ni vide', () => {
		expect(normalizeStringList(' poisson ')).toEqual(['poisson']);
		expect(normalizeStringList(['a', ' ', 'b', 'a', null])).toEqual(['a', 'b']);
	});

	it('déplie un JSON dans une chaîne, y compris doublement encodé ou imbriqué', () => {
		expect(normalizeStringList('["a","b"]')).toEqual(['a', 'b']);
		expect(normalizeStringList(['["a","b"]', 'c'])).toEqual(['a', 'b', 'c']);
		expect(normalizeStringList([['x', ['y']], '[["z"]]'])).toEqual(['x', 'y', 'z']);
	});

	it('conserve une chaîne qui commence par un crochet sans être du JSON', () => {
		expect(normalizeStringList('[pas du json')).toEqual(['[pas du json']);
		expect(normalizeStringList(['[autre'])).toEqual(['[autre']);
	});
});
