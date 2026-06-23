import { prisma } from '$lib/server';
import { breadMacrosForGrams, type BreadTypeValue } from '$lib/schema/profile/breadType';
import { targetCaloriesPerDay, dailyProteinTargetG } from '$lib/nutrition/nutritionTargets';
import { currentProgramDayIndex } from '$lib/utils/programDay';

const SCALE_MIN = 0.15;
const SCALE_MAX = 2.5;
const DEFAULT_REFERENCE_G = 100;

function clamp(scale: number): number {
	return Math.min(SCALE_MAX, Math.max(SCALE_MIN, scale));
}

function mealFraction(position: string, intermittentFasting: boolean): number {
	if (intermittentFasting) {
		if (position === 'BREAKFAST') return 0.3; // masqué en UI mais présent en BDD
		return 0.5; // LUNCH et DINNER absorbent le budget visible
	}
	if (position === 'BREAKFAST') return 0.3;
	if (position === 'LUNCH') return 0.35;
	if (position === 'DINNER') return 0.35;
	return 1 / 3;
}

/**
 * Met à jour les quantités (quantityG + macros calculés) de tous les repas futurs
 * non-manuels en fonction du nouveau TDEE (nouveau poids ou nouveau % masse grasse).
 * Les jours passés (≤ currentDayIndex) ne sont pas touchés.
 * À appeler en tâche de fond après chaque changement de BodyMeasurement ou bodyFatPercent.
 */
export async function rescaleFutureMeals(userId: string): Promise<void> {
	const [profile, lastMeasure, user] = await Promise.all([
		prisma.userProfile.findUnique({
			where: { userId },
			select: {
				bodyFatPercent: true,
				activityLevel: true,
				breadDaily: true,
				breadGramsPerDay: true,
				breadType: true,
				intermittentFastingMorning: true
			}
		}),
		prisma.bodyMeasurement.findFirst({
			where: { userId },
			orderBy: { createdAt: 'desc' },
			select: { weightKg: true }
		}),
		prisma.user.findUnique({
			where: { id: userId },
			select: { programStartDate: true }
		})
	]);

	const weightKg = lastMeasure?.weightKg ?? null;
	if (!weightKg || !profile?.bodyFatPercent) return;

	const newTargetKcal = targetCaloriesPerDay({ weightKg, bodyFatPercent: profile.bodyFatPercent, activityLevel: profile.activityLevel as import('@prisma/client').ActivityLevel | null });
	if (!newTargetKcal) return;

	let breadKcal = 0;
	if (profile.breadDaily && profile.breadType && profile.breadGramsPerDay != null && profile.breadGramsPerDay > 0) {
		breadKcal = breadMacrosForGrams(profile.breadType as BreadTypeValue, profile.breadGramsPerDay).kcal;
	}
	const mealBudget = Math.max(newTargetKcal - breadKcal, 0);
	if (mealBudget <= 0) return;

	const newTargetProteinG = dailyProteinTargetG(weightKg, profile.bodyFatPercent);
	const isIF = profile.intermittentFastingMorning ?? false;
	const currentDayIndex = currentProgramDayIndex(user?.programStartDate ?? null);

	const futureDays = await prisma.nutritionDay.findMany({
		where: { userId, dayIndex: { gt: currentDayIndex } },
		include: {
			meals: {
				where: { isManual: false },
				include: {
					recipe: {
						select: {
							referenceYieldG: true,
							nutritionKcal: true,
							nutritionProteinG: true,
							nutritionCarbsG: true,
							nutritionFatG: true,
							nutritionFiberG: true
						}
					}
				}
			}
		}
	});

	const updates: Parameters<typeof prisma.meal.update>[0][] = [];

	for (const day of futureDays) {
		for (const meal of day.meals) {
			const recipe = meal.recipe;
			if (!recipe || (recipe.nutritionKcal ?? 0) <= 0) continue;

			const refG = recipe.referenceYieldG != null && recipe.referenceYieldG > 0
				? recipe.referenceYieldG
				: DEFAULT_REFERENCE_G;

			const frac = mealFraction(meal.position, isIF);
			const baseKcal = recipe.nutritionKcal!;
			const baseProtein = recipe.nutritionProteinG ?? 0;

			let calorieScale = (mealBudget * frac) / baseKcal;
			let proteinScale = Number.POSITIVE_INFINITY;
			if (newTargetProteinG > 0 && baseProtein > 0) {
				proteinScale = (newTargetProteinG * frac) / baseProtein;
			}

			const scale = clamp(Math.min(calorieScale, proteinScale));
			const newQuantityG = refG * scale;
			const factor = newQuantityG / refG;

			updates.push(prisma.meal.update({
				where: { id: meal.id },
				data: {
					quantityG: newQuantityG,
					calcCalories: recipe.nutritionKcal != null ? recipe.nutritionKcal * factor : null,
					calcProteinG: recipe.nutritionProteinG != null ? recipe.nutritionProteinG * factor : null,
					calcCarbsG: recipe.nutritionCarbsG != null ? recipe.nutritionCarbsG * factor : null,
					calcFatG: recipe.nutritionFatG != null ? recipe.nutritionFatG * factor : null,
					calcFiberG: recipe.nutritionFiberG != null ? recipe.nutritionFiberG * factor : null
				}
			}));
		}
	}

	if (updates.length > 0) {
		await prisma.$transaction(updates);
	}
}
