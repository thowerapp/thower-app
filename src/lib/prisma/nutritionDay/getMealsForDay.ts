import { prisma } from '$lib/server';

export async function getMealsForNutritionDay(nutritionDayId: string) {
	return prisma.meal.findMany({
		where: { nutritionDayId },
		include: { recipe: true },
		orderBy: { position: 'asc' }
	});
}
