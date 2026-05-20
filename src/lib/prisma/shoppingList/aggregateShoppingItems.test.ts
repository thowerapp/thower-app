import { describe, expect, it } from 'vitest';
import {
	addToShoppingAggregate,
	aggregateShoppingItemsFromPlanningDays,
	mergeReportedItemsIntoAggregate,
	REPORT_SOURCE_LABEL,
	sortAggregatedShoppingItems,
	type AggregatedShoppingItem,
	type PlanningDayInput
} from './aggregateShoppingItems';
import { shoppingListAggregateKey } from '$lib/nutrition/normalizeIngredientName';

function emptyMap() {
	return new Map<string, AggregatedShoppingItem>();
}

function itemsFromMap(map: Map<string, AggregatedShoppingItem>) {
	return Array.from(map.values());
}

describe('addToShoppingAggregate', () => {
	it('fusionne le même ingrédient sur plusieurs plats (quantités + sources)', () => {
		const map = emptyMap();
		addToShoppingAggregate(map, 'Poulet', 'Viandes', 'g', 120, false, 'Curry poulet');
		addToShoppingAggregate(map, 'poulet', 'Viandes', 'grammes', 80, false, 'Salade César');

		const items = itemsFromMap(map);
		expect(items).toHaveLength(1);
		expect(items[0].ingredientName).toBe('Poulet');
		expect(items[0].totalQuantityG).toBe(200);
		expect(items[0].sources).toHaveLength(2);
		expect(items[0].sources).toEqual(
			expect.arrayContaining([
				{ recipeName: 'Curry poulet', quantityG: 120 },
				{ recipeName: 'Salade César', quantityG: 80 }
			])
		);
	});

	it('cumule deux fois le même plat', () => {
		const map = emptyMap();
		addToShoppingAggregate(map, 'Riz', 'Féculents', 'g', 50, false, 'Bowl');
		addToShoppingAggregate(map, 'Riz', 'Féculents', 'g', 30, false, 'Bowl');

		const items = itemsFromMap(map);
		expect(items).toHaveLength(1);
		expect(items[0].totalQuantityG).toBe(80);
		expect(items[0].sources).toEqual([{ recipeName: 'Bowl', quantityG: 80 }]);
	});

	it('ne fusionne pas chocolat 90 % et chocolat 50 %', () => {
		const map = emptyMap();
		addToShoppingAggregate(map, 'Chocolat 90%', 'Épicerie', 'g', 20, false, 'Mousse');
		addToShoppingAggregate(map, 'Chocolat 50%', 'Épicerie', 'g', 15, false, 'Cookies');

		const items = itemsFromMap(map);
		expect(items).toHaveLength(2);
		const names = items.map((i) => i.ingredientName).sort();
		expect(names).toEqual(['Chocolat 50%', 'Chocolat 90%']);
		expect(items.find((i) => i.ingredientName === 'Chocolat 90%')?.totalQuantityG).toBe(20);
		expect(items.find((i) => i.ingredientName === 'Chocolat 50%')?.totalQuantityG).toBe(15);
	});

	it('ne fusionne pas le même libellé avec des unités différentes', () => {
		const map = emptyMap();
		addToShoppingAggregate(map, 'Lait', 'Frais', 'ml', 200, false, 'Smoothie');
		addToShoppingAggregate(map, 'Lait', 'Frais', 'g', 50, false, 'Porridge');

		expect(itemsFromMap(map)).toHaveLength(2);
		expect(shoppingListAggregateKey('Lait', 'ml')).not.toBe(shoppingListAggregateKey('Lait', 'g'));
	});

	it('ignore les quantités invalides', () => {
		const map = emptyMap();
		addToShoppingAggregate(map, 'Sel', null, 'g', 0, false, 'Soupe');
		addToShoppingAggregate(map, 'Sel', null, 'g', NaN, false, 'Soupe');
		addToShoppingAggregate(map, 'Sel', null, 'g', -5, false, 'Soupe');

		expect(itemsFromMap(map)).toHaveLength(0);
	});

	it('marque isReported si au moins une entrée reportée', () => {
		const map = emptyMap();
		addToShoppingAggregate(map, 'Oignon', 'Légumes', 'g', 40, false, 'Tajine');
		addToShoppingAggregate(map, 'Oignon', 'Légumes', 'g', 10, true, REPORT_SOURCE_LABEL);

		const items = itemsFromMap(map);
		expect(items[0].isReported).toBe(true);
		expect(items[0].totalQuantityG).toBe(50);
	});
});

describe('mergeReportedItemsIntoAggregate', () => {
	it('réinjecte les sources reportées sans fusionner des variantes', () => {
		const map = emptyMap();
		addToShoppingAggregate(map, 'Chocolat 90%', null, 'g', 10, false, 'Dessert');

		mergeReportedItemsIntoAggregate(map, [
			{
				ingredientName: 'Chocolat 50%',
				category: null,
				unit: 'g',
				totalQuantityG: 25,
				isChecked: false,
				sources: [{ recipeName: 'Cookies', quantityG: 25 }]
			},
			{
				ingredientName: 'Poulet',
				category: 'Viandes',
				unit: 'g',
				totalQuantityG: 100,
				isChecked: true,
				sources: []
			}
		]);

		const items = itemsFromMap(map);
		expect(items).toHaveLength(2);
		expect(items.some((i) => i.ingredientName === 'Chocolat 90%')).toBe(true);
		expect(items.some((i) => i.ingredientName === 'Chocolat 50%')).toBe(true);
		expect(items.find((i) => i.ingredientName === 'Chocolat 50%')?.isReported).toBe(true);
	});

	it('report sans sources utilise le libellé liste précédente', () => {
		const map = emptyMap();
		mergeReportedItemsIntoAggregate(map, [
			{
				ingredientName: 'Citron',
				category: null,
				unit: 'g',
				totalQuantityG: 30,
				isChecked: false,
				sources: []
			}
		]);

		const items = itemsFromMap(map);
		expect(items[0].sources).toEqual([{ recipeName: REPORT_SOURCE_LABEL, quantityG: 30 }]);
		expect(items[0].isReported).toBe(true);
	});
});

describe('aggregateShoppingItemsFromPlanningDays', () => {
	const twoDayPlanning: PlanningDayInput[] = [
		{
			dayIndex: 1,
			meals: [
				{
					quantityG: 200,
					recipe: {
						name: 'Poulet rôti',
						referenceYieldG: 100,
						ingredients: [
							{ name: 'Poulet', quantityG: 150, category: 'Viandes', unit: 'g', order: 0 },
							{ name: 'Chocolat 90%', quantityG: 10, category: 'Épicerie', unit: 'g', order: 1 }
						]
					}
				}
			]
		},
		{
			dayIndex: 2,
			meals: [
				{
					quantityG: 100,
					recipe: {
						name: 'Salade',
						referenceYieldG: 100,
						ingredients: [
							{ name: 'Poulet', quantityG: 80, category: 'Viandes', unit: 'g', order: 0 },
							{ name: 'Chocolat 50%', quantityG: 20, category: 'Épicerie', unit: 'g', order: 1 }
						]
					}
				}
			]
		}
	];

	it('agrège sur plusieurs jours : poulet fusionné, chocolats séparés', () => {
		const items = aggregateShoppingItemsFromPlanningDays(twoDayPlanning);

		const poulet = items.find((i) => i.ingredientName === 'Poulet');
		const ch90 = items.find((i) => i.ingredientName === 'Chocolat 90%');
		const ch50 = items.find((i) => i.ingredientName === 'Chocolat 50%');

		expect(items).toHaveLength(3);
		// J1: 150*(200/100)=300, J2: 80*(100/100)=80 → 380
		expect(poulet?.totalQuantityG).toBe(380);
		expect(poulet?.sources).toHaveLength(2);
		expect(ch90?.totalQuantityG).toBe(20); // 10 * 2
		expect(ch50?.totalQuantityG).toBe(20); // 20 * 1
	});

	it('ignore les ingrédients sans quantityG', () => {
		const items = aggregateShoppingItemsFromPlanningDays([
			{
				dayIndex: 1,
				meals: [
					{
						quantityG: 100,
						recipe: {
							name: 'Soupe',
							referenceYieldG: 100,
							ingredients: [
								{ name: 'Sel', quantityG: null, category: null, unit: null },
								{ name: 'Carotte', quantityG: 50, category: 'Légumes', unit: 'g' }
							]
						}
					}
				]
			}
		]);

		expect(items).toHaveLength(1);
		expect(items[0].ingredientName).toBe('Carotte');
	});

	it('ignore les repas sans recette', () => {
		expect(
			aggregateShoppingItemsFromPlanningDays([{ dayIndex: 1, meals: [{ quantityG: 100, recipe: null }] }])
		).toHaveLength(0);
	});
});

describe('sortAggregatedShoppingItems', () => {
	const sample: AggregatedShoppingItem[] = [
		{
			ingredientName: 'Banane',
			category: 'Fruits',
			unit: 'g',
			totalQuantityG: 1,
			isReported: false,
			sources: []
		},
		{
			ingredientName: 'Avocat',
			category: 'Fruits',
			unit: 'g',
			totalQuantityG: 1,
			isReported: false,
			sources: []
		},
		{
			ingredientName: 'Steak',
			category: 'Viandes',
			unit: 'g',
			totalQuantityG: 1,
			isReported: false,
			sources: []
		}
	];

	it('tri alphabétique par nom', () => {
		const sorted = sortAggregatedShoppingItems(sample, 'alphabetical');
		expect(sorted.map((i) => i.ingredientName)).toEqual(['Avocat', 'Banane', 'Steak']);
	});

	it('tri par catégorie puis nom', () => {
		const sorted = sortAggregatedShoppingItems(sample, 'category');
		expect(sorted.map((i) => i.category)).toEqual(['Fruits', 'Fruits', 'Viandes']);
		expect(sorted[0].ingredientName).toBe('Avocat');
		expect(sorted[1].ingredientName).toBe('Banane');
	});
});
