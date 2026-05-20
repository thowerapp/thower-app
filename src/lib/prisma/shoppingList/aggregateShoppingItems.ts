import { shoppingListAggregateKey } from '$lib/nutrition/normalizeIngredientName';
import { scaledIngredientGrams } from '$lib/nutrition/scaleMealIngredients';
import type { ShoppingItemSource } from './types';

export type AggregatedShoppingItem = {
	ingredientName: string;
	category: string | null;
	unit: string | null;
	totalQuantityG: number;
	isReported: boolean;
	sources: ShoppingItemSource[];
};

export type ShoppingListSortOrder = 'category' | 'alphabetical';

export const REPORT_SOURCE_LABEL = 'Liste précédente';

function pickCategory(current: string | null, next: string | null): string | null {
	if (current) return current;
	return next;
}

function pickUnit(current: string | null, next: string | null): string | null {
	if (current) return current;
	return next;
}

function addSourceLine(item: AggregatedShoppingItem, recipeName: string, quantityG: number): void {
	const existing = item.sources.find((s) => s.recipeName === recipeName);
	if (existing) {
		existing.quantityG += quantityG;
	} else {
		item.sources.push({ recipeName, quantityG });
	}
}

/** Ajoute une ligne (ou fusionne) dans la map d'agrégation. */
export function addToShoppingAggregate(
	aggregated: Map<string, AggregatedShoppingItem>,
	name: string,
	category: string | null,
	unit: string | null,
	qty: number,
	isReported: boolean,
	recipeName: string | null
): void {
	if (!Number.isFinite(qty) || qty <= 0) return;

	const key = shoppingListAggregateKey(name, unit);
	if (!key) return;

	const displayName = name.trim() || name;
	const existing = aggregated.get(key);

	if (existing) {
		existing.totalQuantityG += qty;
		existing.isReported = existing.isReported || isReported;
		existing.category = pickCategory(existing.category, category);
		existing.unit = pickUnit(existing.unit, unit);
		if (recipeName) addSourceLine(existing, recipeName, qty);
	} else {
		const sources: ShoppingItemSource[] = recipeName ? [{ recipeName, quantityG: qty }] : [];
		aggregated.set(key, {
			ingredientName: displayName,
			category,
			unit,
			totalQuantityG: qty,
			isReported,
			sources
		});
	}
}

export function sortAggregatedShoppingItems(
	items: AggregatedShoppingItem[],
	sortOrder: ShoppingListSortOrder
): AggregatedShoppingItem[] {
	const sorted = [...items];
	if (sortOrder === 'alphabetical') {
		sorted.sort((a, b) => a.ingredientName.localeCompare(b.ingredientName, 'fr'));
	} else {
		sorted.sort((a, b) => {
			const catA = a.category ?? '';
			const catB = b.category ?? '';
			if (catA !== catB) return catA.localeCompare(catB, 'fr');
			return a.ingredientName.localeCompare(b.ingredientName, 'fr');
		});
	}
	return sorted;
}

export type PlanningIngredientInput = {
	name: string;
	quantityG: number | null;
	category: string | null;
	unit: string | null;
	order?: number;
};

export type PlanningMealInput = {
	quantityG: number | null;
	recipe: {
		name: string | null;
		referenceYieldG: number | null;
		ingredients: PlanningIngredientInput[];
	} | null;
};

export type PlanningDayInput = {
	dayIndex: number;
	meals: PlanningMealInput[];
};

/** Agrège les ingrédients d'une période de planning (sans Prisma). */
export function aggregateShoppingItemsFromPlanningDays(
	days: PlanningDayInput[]
): AggregatedShoppingItem[] {
	const aggregated = new Map<string, AggregatedShoppingItem>();

	for (const day of days) {
		for (const meal of day.meals) {
			const recipe = meal.recipe;
			if (!recipe) continue;
			const recipeName = recipe.name?.trim() ? recipe.name.trim() : 'Repas';
			const sortedIngredients = [...recipe.ingredients].sort(
				(a, b) => (a.order ?? 0) - (b.order ?? 0)
			);
			for (const ing of sortedIngredients) {
				const qty = scaledIngredientGrams(ing.quantityG, meal.quantityG, recipe.referenceYieldG);
				if (qty == null || qty <= 0) continue;
				addToShoppingAggregate(
					aggregated,
					ing.name,
					ing.category,
					ing.unit,
					qty,
					false,
					recipeName
				);
			}
		}
	}

	return Array.from(aggregated.values());
}

export type ReportedItemInput = {
	ingredientName: string;
	category: string | null;
	unit: string | null;
	totalQuantityG: number;
	isChecked: boolean;
	sources: ShoppingItemSource[];
};

/** Fusionne les articles reportés (liste précédente) dans une map existante. */
export function mergeReportedItemsIntoAggregate(
	aggregated: Map<string, AggregatedShoppingItem>,
	reported: ReportedItemInput[]
): void {
	for (const item of reported) {
		if (item.isChecked) continue;
		if (item.sources.length > 0) {
			for (const src of item.sources) {
				addToShoppingAggregate(
					aggregated,
					item.ingredientName,
					item.category,
					item.unit,
					src.quantityG,
					true,
					src.recipeName
				);
			}
		} else {
			addToShoppingAggregate(
				aggregated,
				item.ingredientName,
				item.category,
				item.unit,
				item.totalQuantityG,
				true,
				REPORT_SOURCE_LABEL
			);
		}
	}
}
