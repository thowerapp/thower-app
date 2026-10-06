import { prisma } from '$lib/server';
import { breadMacrosForGrams, type BreadTypeValue } from '$lib/schema/profile/breadType';
import { targetCaloriesPerDay, dailyProteinTargetG } from '$lib/nutrition/nutritionTargets';
import { computeMealPortion, mealSlotTargets } from '$lib/nutrition/mealPortion';
import { currentProgramDayIndex } from '$lib/utils/programDay';
import { regenerateShoppingListsOverlappingDay } from '$lib/prisma/shoppingList/regenerateOverlappingDay';

type UserMealTargets = { mealBudgetKcal: number; proteinG: number };

/** Budget kcal repas (cible − pain) et protéines journalières ; null si profil incomplet. */
async function loadUserMealTargets(userId: string): Promise<UserMealTargets | null> {
	const [profile, lastMeasure] = await Promise.all([
		prisma.userProfile.findUnique({
			where: { userId },
			select: {
				bodyFatPercent: true,
				activityLevel: true,
				breadDaily: true,
				breadGramsPerDay: true,
				breadType: true
			}
		}),
		prisma.bodyMeasurement.findFirst({
			where: { userId },
			orderBy: { createdAt: 'desc' },
			select: { weightKg: true }
		})
	]);

	const weightKg = lastMeasure?.weightKg ?? null;
	if (!weightKg || !profile?.bodyFatPercent) return null;

	const targetKcal = targetCaloriesPerDay({ weightKg, bodyFatPercent: profile.bodyFatPercent, activityLevel: profile.activityLevel as import('@prisma/client').ActivityLevel | null });
	if (!targetKcal) return null;

	let breadKcal = 0;
	if (profile.breadDaily && profile.breadType && profile.breadGramsPerDay != null && profile.breadGramsPerDay > 0) {
		breadKcal = breadMacrosForGrams(profile.breadType as BreadTypeValue, profile.breadGramsPerDay).kcal;
	}
	const mealBudgetKcal = Math.max(targetKcal - breadKcal, 0);
	if (mealBudgetKcal <= 0) return null;

	return { mealBudgetKcal, proteinG: dailyProteinTargetG(weightKg, profile.bodyFatPercent) };
}

const dayMealsInclude = {
	meals: {
		where: { isManual: false },
		include: {
			recipe: {
				select: {
					referenceYieldG: true,
					nutritionProteinG: true,
					nutritionCarbsG: true,
					nutritionFatG: true,
					nutritionFiberG: true,
					ingredients: {
						select: { name: true, quantityG: true, category: true },
						orderBy: { order: 'asc' as const }
					}
				}
			}
		}
	}
};

/** Recalcule les portions (quantityG, féculent ajouté, macros) des repas non manuels des jours donnés. */
async function rescaleDays(dayWhere: { userId: string; dayIndex?: { gt: number }; id?: string }, targets: UserMealTargets): Promise<void> {
	const days = await prisma.nutritionDay.findMany({ where: dayWhere, include: dayMealsInclude });

	const updates: ReturnType<typeof prisma.meal.update>[] = [];
	for (const day of days) {
		for (const meal of day.meals) {
			if (!meal.recipe) continue;
			const slot = mealSlotTargets(meal.position, day.intermittentFasting, targets.mealBudgetKcal, targets.proteinG);
			updates.push(prisma.meal.update({
				where: { id: meal.id },
				data: computeMealPortion(meal.recipe, slot)
			}));
		}
	}

	if (updates.length > 0) {
		await prisma.$transaction(updates);
	}
}

/**
 * Met à jour les portions de tous les repas futurs non manuels en fonction de la cible actuelle
 * (nouveau poids, nouveau % masse grasse…). Les jours passés (≤ currentDayIndex) ne sont pas touchés.
 * Le créneau de chaque repas suit le jeûne du jour (30/35/35 ou 50/50).
 */
export async function rescaleFutureMeals(userId: string): Promise<void> {
	const [targets, user] = await Promise.all([
		loadUserMealTargets(userId),
		prisma.user.findUnique({ where: { id: userId }, select: { programStartDate: true } })
	]);
	if (!targets) return;

	const currentDayIndex = currentProgramDayIndex(user?.programStartDate ?? null);
	await rescaleDays({ userId, dayIndex: { gt: currentDayIndex } }, targets);
}

/** Recalcule les portions d'une journée (ex. activation / désactivation du jeûne) puis la liste de courses. */
export async function rescaleDayMeals(userId: string, nutritionDayId: string, dayIndex: number): Promise<void> {
	const targets = await loadUserMealTargets(userId);
	if (!targets) return;

	await rescaleDays({ userId, id: nutritionDayId }, targets);
	await regenerateShoppingListsOverlappingDay(userId, dayIndex);
}
