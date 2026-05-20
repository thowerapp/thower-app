import { describe, expect, it } from 'vitest';
import {
	normalizeIngredientName,
	shoppingListAggregateKey
} from './normalizeIngredientName';

describe('normalizeIngredientName', () => {
	it('fusionne casse et accents pour le même libellé', () => {
		expect(normalizeIngredientName('Poulet')).toBe(normalizeIngredientName('poulet'));
		expect(normalizeIngredientName('Épinards')).toBe(normalizeIngredientName('epinards'));
	});

	it('normalise les espaces', () => {
		expect(normalizeIngredientName('  tomate   cerise  ')).toBe('tomate cerise');
	});

	it('conserve les pourcentages et chiffres (variantes distinctes)', () => {
		expect(normalizeIngredientName('Chocolat 90%')).not.toBe(normalizeIngredientName('Chocolat 50%'));
		expect(normalizeIngredientName('Chocolat noir 90 %')).not.toBe(
			normalizeIngredientName('Chocolat noir 50 %')
		);
	});
});

describe('shoppingListAggregateKey', () => {
	it('fusionne le même ingrédient sur plusieurs plats', () => {
		expect(shoppingListAggregateKey('Poulet', 'g')).toBe(shoppingListAggregateKey('poulet', 'grammes'));
	});

	it('ne fusionne pas des variantes (90 % vs 50 %)', () => {
		expect(shoppingListAggregateKey('Chocolat 90%', 'g')).not.toBe(
			shoppingListAggregateKey('Chocolat 50%', 'g')
		);
	});

	it('ne fusionne pas des unités incompatibles', () => {
		expect(shoppingListAggregateKey('Lait', 'ml')).not.toBe(shoppingListAggregateKey('Lait', 'g'));
	});
});
