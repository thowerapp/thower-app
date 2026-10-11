import { prisma } from '$lib/server';
import type { MealMacroTargets } from '$lib/nutrition/nutritionTargets';
import type { MacroValues, MealPortion } from '$lib/nutrition/mealPortion';
import { fitDay, isCountedMeal } from '$lib/nutrition/dayPlanner';
import {
	regenerateShoppingListsOverlappingDay,
	regenerateShoppingListsOverlappingDays
} from '$lib/prisma/shoppingList/regenerateOverlappingDay';
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

type DayWhere = {
	userId: string;
	dayIndex?: { gt?: number; gte?: number; lte?: number };
	id?: string | { in: string[] };
};

function loadDays(dayWhere: DayWhere) {
	return prisma.nutritionDay.findMany({ where: dayWhere, include: dayMealsInclude });
}

/** Repas que le programme ajuste : recette, ni saisie manuelle ni déjà mangé. */
export function isAdjustableMeal(m: {
	recipe: unknown;
	isManual: boolean;
	eatenAt: Date | null;
}): boolean {
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

/** Mises à jour par transaction : MongoDB annule une transaction au-delà de 60 s. */
const UPDATES_PER_TRANSACTION = 60;

/** Recalcule ensemble les portions et compléments des repas ajustables ; seules les portions périmées sont réécrites. */
async function refitDays(dayWhere: DayWhere, targets: MealMacroTargets): Promise<void> {
	const days = await loadDays(dayWhere);
	const updates = days.flatMap((day) =>
		refitDayPortions(day, targets)
			.filter(({ mealId, portion }) =>
				isStalePortion(day.meals.find((m) => m.id === mealId)!, portion)
			)
			.map(({ mealId, portion }) => prisma.meal.update({ where: { id: mealId }, data: portion }))
	);
	for (let k = 0; k < updates.length; k += UPDATES_PER_TRANSACTION) {
		await prisma.$transaction(updates.slice(k, k + UPDATES_PER_TRANSACTION));
	}
}

/** Change quand l'algorithme de portions change : force un recalage unique des comptes existants. */
const PORTION_ALGORITHM_VERSION = 1;

/** Empreinte des cibles (arrondies au dixième) qui pilotent les portions du cadencier. */
export function targetsKey(targets: MealMacroTargets): string {
	const r = (v: number) => Math.round(v * 10) / 10;
	return `v${PORTION_ALGORITHM_VERSION}|${[targets.kcal, targets.proteinG, targets.carbsG, targets.fatG, targets.fiberG].map(r).join('|')}`;
}

/**
 * Recalcule tout le cadencier sur les cibles actuelles du profil (nouveau poids, % masse grasse, activité,
 * pain…). Les repas déjà mangés ou saisis à la main ne changent pas ; leur apport est déduit de leur journée.
 * Sans `force`, ne fait rien si les cibles sont celles déjà appliquées.
 */
export async function rescaleUserMeals(
	userId: string,
	options?: { force?: boolean }
): Promise<void> {
	const targets = await loadUserMealTargets(userId);
	if (!targets) return;

	const key = targetsKey(targets);
	if (!options?.force) {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { nutritionTargetsKey: true }
		});
		if (user?.nutritionTargetsKey === key) return;
	}

	await refitDays({ userId }, targets);
	await prisma.user.update({ where: { id: userId }, data: { nutritionTargetsKey: key } });
}

/** Recalcule les portions de journées données (sans liste de courses). */
export async function refitDaysById(userId: string, nutritionDayIds: string[]): Promise<void> {
	if (nutritionDayIds.length === 0) return;
	const targets = await loadUserMealTargets(userId);
	if (!targets) return;
	await refitDays({ userId, id: { in: nutritionDayIds } }, targets);
}

/** Recalcule les portions d'une journée (ex. activation / désactivation du jeûne) puis la liste de courses. */
export async function rescaleDayMeals(
	userId: string,
	nutritionDayId: string,
	dayIndex: number
): Promise<void> {
	await refitDaysById(userId, [nutritionDayId]);
	await regenerateShoppingListsOverlappingDay(userId, dayIndex);
}

/** true si la portion enregistrée ne correspond plus au calcul actuel (profil, jeûne, recette ou programme modifiés). */
function isStalePortion(
	meal: {
		quantityG: number | null;
		extraStarchG: number | null;
		extraStarchIngredientName: string | null;
		complements: { name: string; grams: number }[];
		ingredientGrams: { name: string; grams: number }[];
		calcCalories: number | null;
	},
	portion: MealPortion
): boolean {
	const complementsKey = (list: { name: string; grams: number }[]) =>
		list.map((c) => `${c.name}:${Math.round(c.grams)}`).join('|');
	return (
		complementsKey(meal.complements) !== complementsKey(portion.complements) ||
		complementsKey(meal.ingredientGrams) !== complementsKey(portion.ingredientGrams) ||
		Math.abs((meal.quantityG ?? 0) - portion.quantityG) > 0.5 ||
		(meal.extraStarchG ?? null) !== portion.extraStarchG ||
		(meal.extraStarchIngredientName ?? null) !== portion.extraStarchIngredientName ||
		Math.abs((meal.calcCalories ?? 0) - (portion.calcCalories ?? 0)) > 1
	);
}

/**
 * Recalage à l'affichage : recalcule les journées [from, to] et enregistre les portions qui ne
 * correspondent plus au calcul actuel (jeûne basculé sans recalcul, profil ou recette modifiés, repas
 * calculés par une ancienne version). Les repas mangés ou manuels ne changent pas. Le calcul étant
 * déterministe, une journée à jour n'est jamais réécrite.
 */
export async function refreshStaleDays(
	userId: string,
	from: number,
	to: number,
	/** Cibles déjà chargées par l'appelant (évite de relire profil et poids) ; `undefined` = les charger. */
	preloadedTargets?: MealMacroTargets | null
): Promise<void> {
	const targets = preloadedTargets === undefined ? await loadUserMealTargets(userId) : preloadedTargets;
	if (!targets) return;

	const days = await loadDays({ userId, dayIndex: { gte: from, lte: to } });
	const updates: ReturnType<typeof prisma.meal.update>[] = [];
	const changedDays = new Set<number>();
	for (const day of days) {
		for (const { mealId, portion } of refitDayPortions(day, targets)) {
			const meal = day.meals.find((m) => m.id === mealId)!;
			if (!isStalePortion(meal, portion)) continue;
			updates.push(prisma.meal.update({ where: { id: mealId }, data: portion }));
			changedDays.add(day.dayIndex);
		}
	}
	if (updates.length === 0) return;
	await prisma.$transaction(updates);
	await regenerateShoppingListsOverlappingDays(userId, [...changedDays]);
}
