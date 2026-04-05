import { prisma } from '$lib/server';
import { PROGRAM_NUTRITION_DAYS, generateNutrition91Days } from './nutrition/generateNutrition91Days';

function expectedMealCount(breakfastEnabled: boolean): number {
	return breakfastEnabled ? 3 : 2;
}

/**
 * Vérifie si le bloc nutrition 91j est déjà complété (dernier jour + nombre de repas attendu).
 */
async function isNutritionProgramComplete(userId: string): Promise<boolean> {
	const profile = await prisma.userProfile.findUnique({
		where: { userId },
		select: { breakfastEnabled: true }
	});
	const expected = expectedMealCount(profile?.breakfastEnabled ?? false);

	const lastDay = await prisma.nutritionDay.findUnique({
		where: { userId_dayIndex: { userId, dayIndex: PROGRAM_NUTRITION_DAYS } },
		include: { meals: true }
	});

	return lastDay != null && lastDay.meals.length >= expected;
}

/**
 * Génère le programme (nutrition 91 jours, puis extensions sport / autres).
 * Idempotent : ne régénère pas si le dernier jour est déjà peuplé correctement.
 */
export async function generateProgramForUser(userId: string): Promise<void> {
	if (await isNutritionProgramComplete(userId)) {
		return;
	}

	await generateNutrition91Days(userId);

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { programStartDate: true }
	});
	if (user && user.programStartDate == null) {
		const start = new Date();
		start.setUTCHours(0, 0, 0, 0);
		await prisma.user.update({
			where: { id: userId },
			data: { programStartDate: start }
		});
	}
}
