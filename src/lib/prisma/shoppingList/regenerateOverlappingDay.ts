import { prisma } from '$lib/server';
import { generateShoppingListFromPlanning } from './generateFromPlanning';

/**
 * Régénère toutes les listes de courses de l'utilisateur dont la période
 * contient le jour donné (startDayIndex <= dayIndex <= endDayIndex).
 * À appeler après modification d'un repas ou d'une recette.
 */
export async function regenerateShoppingListsOverlappingDay(
	userId: string,
	dayIndex: number
): Promise<void> {
	const db = prisma as {
		shoppingList?: {
			findMany: (args: {
				where: { userId: string; startDayIndex: { lte: number }; endDayIndex: { gte: number } };
				select: { startDayIndex: true; endDayIndex: true };
			}) => Promise<Array<{ startDayIndex: number; endDayIndex: number }>>;
		};
	};
	if (!db.shoppingList) return;

	const lists = await db.shoppingList.findMany({
		where: {
			userId,
			startDayIndex: { lte: dayIndex },
			endDayIndex: { gte: dayIndex }
		},
		select: { startDayIndex: true, endDayIndex: true }
	});

	for (const { startDayIndex, endDayIndex } of lists) {
		await generateShoppingListFromPlanning(userId, startDayIndex, endDayIndex, {
			includeReportedFromPrevious: true
		});
	}
}

/**
 * Régénère les listes de courses pour tous les utilisateurs dont au moins un repas
 * utilise la recette donnée. À appeler après modification d'une recette ou de ses ingrédients.
 */
export async function regenerateShoppingListsForRecipe(recipeId: string): Promise<void> {
	const db = prisma as {
		meal?: {
			findMany: (args: {
				where: { recipeId: string };
				include: { nutritionDay: { select: { userId: true; dayIndex: true } } };
			}) => Promise<Array<{ nutritionDay: { userId: string; dayIndex: number } }>>;
		};
	};
	if (!db.meal) return;

	const meals = await db.meal.findMany({
		where: { recipeId },
		include: { nutritionDay: { select: { userId: true, dayIndex: true } } }
	});

	const seen = new Set<string>();
	for (const m of meals) {
		const { userId, dayIndex } = m.nutritionDay;
		const key = `${userId}-${dayIndex}`;
		if (seen.has(key)) continue;
		seen.add(key);
		await regenerateShoppingListsOverlappingDay(userId, dayIndex);
	}
}
