import { prisma } from '$lib/server';
import type { MealMacroTargets } from '$lib/nutrition/nutritionTargets';
import type { MacroValues } from '$lib/nutrition/mealPortion';
import { fitDay, isCountedMeal } from '$lib/nutrition/dayPlanner';
import { currentProgramDayIndex } from '$lib/utils/programDay';
import { regenerateShoppingListsOverlappingDay } from '$lib/prisma/shoppingList/regenerateOverlappingDay';
import { loadUserMealTargets } from './userMealTargets';

export const fitRecipeSelect = {
	referenceYieldG: true,
	nutritionProteinG: true,
	nutritionCarbsG: true,
	nutritionFatG: true,
	nutritionFiberG: true,
	ingredients: {
		select: { name: true, quantityG: true, category: true },
		orderBy: { order: 'asc' as const }
	}
} as const;

const dayMealsInclude = {
	meals: { include: { recipe: { select: fitRecipeSelect } } }
};

type DayWithMeals = Awaited<ReturnType<typeof loadDays>>[number];
type DayMeal = DayWithMeals['meals'][number];

function loadDays(dayWhere: { userId: string; dayIndex?: { gt: number }; id?: string | { in: string[] } }) {
	return prisma.nutritionDay.findMany({ where: dayWhere, include: dayMealsInclude });
}

/** Repas que le programme ajuste : recette, ni saisie manuelle ni déjà mangé. */
export function isAdjustableMeal(m: { recipe: unknown; isManual: boolean; eatenAt: Date | null }): boolean {
	return m.recipe != null && !m.isManual && m.eatenAt == null;
}

/** Apport des repas comptés dans la journée mais non ajustables (manuels, déjà mangés). */
export function fixedDayMacros(
	meals: {
		position: string;
		recipe: unknown;
		isManual: boolean;
		eatenAt: Date | null;
		manualProteinG: number | null;
		manualCarbsG: number | null;
		manualFatG: number | null;
		manualFiberG: number | null;
		calcProteinG: number | null;
		calcCarbsG: number | null;
		calcFatG: number | null;
		calcFiberG: number | null;
	}[],
	intermittentFasting: boolean
): MacroValues {
	const fixed: MacroValues = { proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 };
	for (const m of meals) {
		if (isAdjustableMeal(m) || !isCountedMeal(m.position, intermittentFasting)) continue;
		fixed.proteinG += (m.isManual ? m.manualProteinG : m.calcProteinG) ?? 0;
		fixed.carbsG += (m.isManual ? m.manualCarbsG : m.calcCarbsG) ?? 0;
		fixed.fatG += (m.isManual ? m.manualFatG : m.calcFatG) ?? 0;
		fixed.fiberG += (m.isManual ? m.manualFiberG : m.calcFiberG) ?? 0;
	}
	return fixed;
}

/**
 * Portions recalculées d'une journée (repas ajustables uniquement), via fitDay.
 * `fixedQuantities` : quantité de plat imposée par repas (curseur de l'édition).
 */
export function refitDayPortions(
	day: { intermittentFasting: boolean; meals: DayMeal[] },
	targets: MealMacroTargets,
	fixedQuantities?: Map<string, number>
) {
	const adjustable = day.meals.filter(isAdjustableMeal);
	const portions = fitDay({
		meals: adjustable.map((m) => ({
			position: m.position,
			recipe: m.recipe!,
			fixedQuantityG: fixedQuantities?.get(m.id) ?? null
		})),
		daily: targets,
		intermittentFasting: day.intermittentFasting,
		fixed: fixedDayMacros(day.meals, day.intermittentFasting)
	});
	return adjustable.map((m, k) => ({ mealId: m.id, portion: portions[k] }));
}

/** Recalcule ensemble les portions et compléments des repas ajustables de chaque journée. */
async function refitDays(
	dayWhere: { userId: string; dayIndex?: { gt: number }; id?: string | { in: string[] } },
	targets: MealMacroTargets
): Promise<void> {
	const days = await loadDays(dayWhere);
	const updates = days.flatMap((day) =>
		refitDayPortions(day, targets).map(({ mealId, portion }) =>
			prisma.meal.update({ where: { id: mealId }, data: portion })
		)
	);
	if (updates.length > 0) {
		await prisma.$transaction(updates);
	}
}

/**
 * Met à jour les portions de tous les repas futurs en fonction des cibles actuelles du profil
 * (nouveau poids, nouveau % masse grasse…). Les jours passés (≤ currentDayIndex) ne sont pas touchés.
 */
export async function rescaleFutureMeals(userId: string): Promise<void> {
	const [targets, user] = await Promise.all([
		loadUserMealTargets(userId),
		prisma.user.findUnique({ where: { id: userId }, select: { programStartDate: true } })
	]);
	if (!targets) return;

	const currentDayIndex = currentProgramDayIndex(user?.programStartDate ?? null);
	await refitDays({ userId, dayIndex: { gt: currentDayIndex } }, targets);
}

/** Recalcule les portions de journées données (sans liste de courses). */
export async function refitDaysById(userId: string, nutritionDayIds: string[]): Promise<void> {
	if (nutritionDayIds.length === 0) return;
	const targets = await loadUserMealTargets(userId);
	if (!targets) return;
	await refitDays({ userId, id: { in: nutritionDayIds } }, targets);
}

/** Recalcule les portions d'une journée (ex. activation / désactivation du jeûne) puis la liste de courses. */
export async function rescaleDayMeals(userId: string, nutritionDayId: string, dayIndex: number): Promise<void> {
	await refitDaysById(userId, [nutritionDayId]);
	await regenerateShoppingListsOverlappingDay(userId, dayIndex);
}
