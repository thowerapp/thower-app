import { prisma } from '$lib/server';
import { shoppingListAggregateKey } from '$lib/nutrition/normalizeIngredientName';
import {
	aggregateShoppingItemsFromPlanningDays,
	mergeReportedItemsIntoAggregate,
	sortAggregatedShoppingItems,
	type AggregatedShoppingItem,
	type PlanningDayInput
} from './aggregateShoppingItems';
import {
	parseShoppingItemSources,
	type ShoppingListWithItems
} from './types';

export type GenerateShoppingListOptions = {
	/** Inclure les articles non cochés de la liste précédente (report) */
	includeReportedFromPrevious?: boolean;
};

/**
 * Génère ou régénère une liste de courses pour la période [startDayIndex, endDayIndex]
 * à partir du planning repas (NutritionDay → Meal → Recipe → RecipeIngredient).
 * Ingrédients fusionnés par libellé complet + unité (ex. chocolat 90 % ≠ 50 %) ; quantités = scaledIngredientGrams.
 */
export async function generateShoppingListFromPlanning(
	userId: string,
	startDayIndex: number,
	endDayIndex: number,
	options: GenerateShoppingListOptions = {}
): Promise<{ listId: string; list: ShoppingListWithItems } | null> {
	const { includeReportedFromPrevious = true } = options;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const db = prisma as any;

	if (!db.nutritionDay || !db.shoppingList || !db.shoppingItem || !db.userProfile) {
		return null;
	}

	const profile = await db.userProfile.findUnique({
		where: { userId },
		select: { shoppingListSortOrder: true }
	});
	const sortOrder = profile?.shoppingListSortOrder === 'alphabetical' ? 'alphabetical' : 'category';

	const nutritionDays = await db.nutritionDay.findMany({
		where: { userId, dayIndex: { gte: startDayIndex, lte: endDayIndex } },
		select: {
			dayIndex: true,
			meals: {
				select: {
					quantityG: true,
					recipe: {
						select: {
							name: true,
							referenceYieldG: true,
							ingredients: {
								select: {
									name: true,
									quantityG: true,
									category: true,
									unit: true,
									order: true
								},
								orderBy: { order: 'asc' }
							}
						}
					}
				}
			}
		},
		orderBy: { dayIndex: 'asc' }
	});

	const aggregated = new Map<string, AggregatedShoppingItem>();
	for (const item of aggregateShoppingItemsFromPlanningDays(
		nutritionDays as PlanningDayInput[]
	)) {
		aggregated.set(shoppingListAggregateKey(item.ingredientName, item.unit), item);
	}

	if (includeReportedFromPrevious && startDayIndex > 1) {
		const previousList = await db.shoppingList.findFirst({
			where: { userId, endDayIndex: startDayIndex - 1 },
			orderBy: { generatedAt: 'desc' },
			include: { items: true }
		});
		if (previousList) {
			mergeReportedItemsIntoAggregate(
				aggregated,
				previousList.items.map(
					(item: {
						ingredientName: string;
						category: string | null;
						unit: string | null;
						totalQuantityG: number;
						isChecked: boolean;
						sources: unknown;
					}) => ({
						ingredientName: item.ingredientName,
						category: item.category,
						unit: item.unit,
						totalQuantityG: item.totalQuantityG,
						isChecked: item.isChecked,
						sources: parseShoppingItemSources(item.sources)
					})
				)
			);
		}
	}

	const items = sortAggregatedShoppingItems(Array.from(aggregated.values()), sortOrder);

	await db.shoppingList.deleteMany({
		where: { userId, startDayIndex, endDayIndex }
	});

	const list = await db.shoppingList.create({
		data: { userId, startDayIndex, endDayIndex },
		select: {
			id: true,
			startDayIndex: true,
			endDayIndex: true,
			generatedAt: true
		}
	});

	const createdItems: ShoppingListWithItems['items'] = [];

	if (items.length > 0) {
		await db.shoppingItem.createMany({
			data: items.map((it) => ({
				listId: list.id,
				ingredientName: it.ingredientName,
				category: it.category,
				totalQuantityG: Math.round(it.totalQuantityG * 10) / 10,
				unit: it.unit,
				isChecked: false,
				isReported: it.isReported,
				sources: it.sources.map((s) => ({
					recipeName: s.recipeName,
					quantityG: Math.round(s.quantityG * 10) / 10
				}))
			}))
		});

		const rows = await db.shoppingItem.findMany({
			where: { listId: list.id },
			select: {
				id: true,
				ingredientName: true,
				category: true,
				totalQuantityG: true,
				unit: true,
				isChecked: true,
				isReported: true,
				sources: true
			}
		});

		const orderMap = new Map(
			items.map((it, i) => [shoppingListAggregateKey(it.ingredientName, it.unit), i])
		);
		rows.sort(
			(a: { ingredientName: string; unit: string | null }, b: { ingredientName: string; unit: string | null }) => {
				const ia = orderMap.get(shoppingListAggregateKey(a.ingredientName, a.unit)) ?? 999;
				const ib = orderMap.get(shoppingListAggregateKey(b.ingredientName, b.unit)) ?? 999;
				return ia - ib;
			}
		);

		for (const row of rows) {
			createdItems.push({
				id: row.id,
				ingredientName: row.ingredientName,
				category: row.category,
				totalQuantityG: row.totalQuantityG,
				unit: row.unit,
				isChecked: row.isChecked,
				isReported: row.isReported,
				sources: parseShoppingItemSources(row.sources)
			});
		}
	}

	const result: ShoppingListWithItems = {
		id: list.id,
		startDayIndex: list.startDayIndex,
		endDayIndex: list.endDayIndex,
		generatedAt: list.generatedAt,
		items: createdItems
	};

	return { listId: list.id, list: result };
}
