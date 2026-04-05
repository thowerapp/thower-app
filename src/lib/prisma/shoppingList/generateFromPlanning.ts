import { prisma } from '$lib/server';

const DEFAULT_REFERENCE_YIELD_G = 100;

export type GenerateShoppingListOptions = {
	/** Inclure les articles non cochés de la liste précédente (report) */
	includeReportedFromPrevious?: boolean;
};

type AggregatedItem = {
	ingredientName: string;
	category: string | null;
	unit: string | null;
	totalQuantityG: number;
	isReported: boolean;
};

/**
 * Génère ou régénère une liste de courses pour la période [startDayIndex, endDayIndex]
 * à partir du planning repas (NutritionDay → Meal → Recipe → RecipeIngredient).
 * Quantités = (meal.quantityG / recipe.referenceYieldG) × ingredient.quantityG (ingrédients sans quantityG exclus).
 * Tri selon UserProfile.shoppingListSortOrder (category | alphabetical).
 */
export async function generateShoppingListFromPlanning(
	userId: string,
	startDayIndex: number,
	endDayIndex: number,
	options: GenerateShoppingListOptions = {}
): Promise<{ listId: string } | null> {
	const { includeReportedFromPrevious = true } = options;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const db = prisma as any;

	if (!db.nutritionDay || !db.shoppingList || !db.shoppingItem || !db.userProfile) {
		return null;
	}

	const profile = await db.userProfile.findUnique({ where: { userId } });
	const sortOrder = profile?.shoppingListSortOrder === 'alphabetical' ? 'alphabetical' : 'category';

	const nutritionDays = await db.nutritionDay.findMany({
		where: { userId, dayIndex: { gte: startDayIndex, lte: endDayIndex } },
		include: {
			meals: {
				include: {
					recipe: { include: { ingredients: true } }
				}
			}
		},
		orderBy: { dayIndex: 'asc' }
	});

	const aggregated = new Map<string, AggregatedItem>();

	function addItem(name: string, category: string | null, unit: string | null, qty: number, isReported: boolean) {
		const key = `${name}|${category ?? ''}|${unit ?? ''}`;
		const existing = aggregated.get(key);
		if (existing) {
			existing.totalQuantityG += qty;
			existing.isReported = existing.isReported || isReported;
		} else {
			aggregated.set(key, { ingredientName: name, category, unit, totalQuantityG: qty, isReported });
		}
	}

	// 1) Ingrédients issus du planning
	for (const nd of nutritionDays) {
		for (const meal of nd.meals) {
			const recipe = meal.recipe;
			if (!recipe || !meal.quantityG || meal.quantityG <= 0) continue;
			const refYield = recipe.referenceYieldG ?? DEFAULT_REFERENCE_YIELD_G;
			const factor = meal.quantityG / refYield;
			const sortedIngredients = [...recipe.ingredients].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
			for (const ing of sortedIngredients) {
				if (ing.quantityG == null || Number.isNaN(ing.quantityG)) continue;
				const qty = ing.quantityG * factor;
				addItem(ing.name, ing.category ?? null, ing.unit ?? null, qty, false);
			}
		}
	}

	// 2) Report : articles non cochés de la liste dont la période se termine juste avant
	if (includeReportedFromPrevious && startDayIndex > 1) {
		const previousList = await db.shoppingList.findFirst({
			where: { userId, endDayIndex: startDayIndex - 1 },
			orderBy: { generatedAt: 'desc' },
			include: { items: true }
		});
		if (previousList) {
			for (const item of previousList.items) {
				if (item.isChecked) continue;
				addItem(item.ingredientName, item.category, item.unit, item.totalQuantityG, true);
			}
		}
	}

	let items = Array.from(aggregated.values());
	if (sortOrder === 'alphabetical') {
		items.sort((a, b) => a.ingredientName.localeCompare(b.ingredientName, 'fr'));
	} else {
		items.sort((a, b) => {
			const catA = a.category ?? '';
			const catB = b.category ?? '';
			if (catA !== catB) return catA.localeCompare(catB, 'fr');
			return a.ingredientName.localeCompare(b.ingredientName, 'fr');
		});
	}

	// Supprimer une liste existante pour la même période
	await db.shoppingList.deleteMany({
		where: { userId, startDayIndex, endDayIndex }
	});

	const list = await db.shoppingList.create({
		data: { userId, startDayIndex, endDayIndex },
		include: { items: true }
	});

	if (items.length > 0) {
		await db.shoppingItem.createMany({
			data: items.map((it) => ({
				listId: list.id,
				ingredientName: it.ingredientName,
				category: it.category,
				totalQuantityG: Math.round(it.totalQuantityG * 10) / 10,
				unit: it.unit,
				isChecked: false,
				isReported: it.isReported
			}))
		});
	}

	return { listId: list.id };
}
