import { prisma } from '$lib/server';
import { generateShoppingListFromPlanning } from './generateFromPlanning';

/**
 * Régénère une seule fois chaque liste de courses de l'utilisateur dont la période contient au moins
 * un des jours donnés (une plage touchée par plusieurs jours n'est pas recalculée plusieurs fois).
 */
export async function regenerateShoppingListsOverlappingDays(
	userId: string,
	dayIndices: number[]
): Promise<void> {
	if (dayIndices.length === 0) return;

	const lists = await prisma.shoppingList.findMany({
		where: {
			userId,
			OR: dayIndices.map((dayIndex) => ({
				startDayIndex: { lte: dayIndex },
				endDayIndex: { gte: dayIndex }
			}))
		},
		select: { startDayIndex: true, endDayIndex: true }
	});

	const seen = new Set<string>();
	for (const { startDayIndex, endDayIndex } of lists) {
		const key = `${startDayIndex}-${endDayIndex}`;
		if (seen.has(key)) continue;
		seen.add(key);
		await generateShoppingListFromPlanning(userId, startDayIndex, endDayIndex, {
			includeReportedFromPrevious: true
		});
	}
}

/**
 * Régénère toutes les listes de courses de l'utilisateur dont la période
 * contient le jour donné (startDayIndex <= dayIndex <= endDayIndex).
 * À appeler après modification d'un repas ou d'une recette.
 */
export async function regenerateShoppingListsOverlappingDay(
	userId: string,
	dayIndex: number
): Promise<void> {
	await regenerateShoppingListsOverlappingDays(userId, [dayIndex]);
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

	const daysByUser = new Map<string, Set<number>>();
	for (const m of meals) {
		const { userId, dayIndex } = m.nutritionDay;
		daysByUser.set(userId, (daysByUser.get(userId) ?? new Set<number>()).add(dayIndex));
	}
	for (const [userId, days] of daysByUser) {
		await regenerateShoppingListsOverlappingDays(userId, [...days]);
	}
}
