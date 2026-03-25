import { prisma } from '$lib/server';

export async function getOrCreateNutritionDay(userId: string, dayIndex: number, intermittentFasting = false) {
	const client = prisma as {
		nutritionDay?: {
			findUnique: (args: { where: { userId_dayIndex: { userId: string; dayIndex: number } }; include: { meals: true } }) => Promise<unknown>;
			create: (args: { data: { userId: string; dayIndex: number; intermittentFasting: boolean } }) => Promise<unknown>;
		};
	};
	if (!client?.nutritionDay) {
		throw new Error('Prisma client has no "nutritionDay" model. Run: npx prisma generate');
	}
	let day = await client.nutritionDay.findUnique({
		where: { userId_dayIndex: { userId, dayIndex } },
		include: { meals: true }
	});
	if (!day) {
		day = await client.nutritionDay.create({
			data: { userId, dayIndex, intermittentFasting }
		});
	}
	return day;
}
