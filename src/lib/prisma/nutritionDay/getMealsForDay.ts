import { prisma } from '$lib/server';

export async function getMealsForNutritionDay(nutritionDayId: string) {
	const client = prisma as {
		meal?: {
			findMany: (args: {
				where: { nutritionDayId: string };
				include: { recipe: true };
				orderBy: { position: 'asc' };
			}) => Promise<unknown[]>;
		};
	};
	if (!client?.meal) return [];
	return client.meal.findMany({
		where: { nutritionDayId },
		include: { recipe: true },
		orderBy: { position: 'asc' }
	});
}
