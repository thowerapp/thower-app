import { prisma } from '$lib/server';

export async function getOrCreateNutritionDay(userId: string, dayIndex: number, intermittentFasting = false) {
	const existing = await prisma.nutritionDay.findUnique({
		where: { userId_dayIndex: { userId, dayIndex } },
		include: { meals: true }
	});
	if (existing) return existing;
	return prisma.nutritionDay.create({
		data: { userId, dayIndex, intermittentFasting },
		include: { meals: true }
	});
}
