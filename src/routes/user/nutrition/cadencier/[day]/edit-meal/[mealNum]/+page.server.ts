import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server';
import { filterRecipesForUser } from '$lib/server/program-generation/nutrition/recipeFilterUtils';
import { getUserProgramCycle } from '$lib/server/programCycle';
import { absoluteDayIndex } from '$lib/utils/programCycle';
import type { MealPosition } from '@prisma/client';
import { upsertMeal } from '$lib/prisma/nutritionDay/upsertMeal';
import { mealBudgetFraction } from '$lib/nutrition/mealPortion';
import { fitDay, type PlannerMeal } from '$lib/nutrition/dayPlanner';
import type { MealMacroTargets } from '$lib/nutrition/nutritionTargets';
import {
	loadUserMealTargets,
	mealTargetsFromProfile,
	mealTargetsProfileSelect
} from '$lib/server/nutrition/userMealTargets';
import {
	fitRecipeSelect,
	fixedDayMacros,
	isAdjustableMeal
} from '$lib/server/nutrition/rescaleUserMeals';
import { requireNutritionAccess } from '$lib/server/programAccessGuard';
import { getCatalogRecipes } from '$lib/server/nutrition/recipeCatalog';
import { positionLabel } from '$lib/nutrition/mealDisplay';
import { TOTAL_PROGRAM_DAYS } from '$lib/utils/programDay';

const TOTAL_DAYS = TOTAL_PROGRAM_DAYS;

function positionFromParam(param: string): MealPosition | null {
	switch (param.toLowerCase()) {
		case 'breakfast':
			return 'BREAKFAST';
		case 'lunch':
			return 'LUNCH';
		case 'dinner':
			return 'DINNER';
		default:
			return null;
	}
}

function recipeCategory(p: MealPosition): string {
	return p === 'BREAKFAST' ? 'BREAKFAST' : 'MEAL';
}

const dayMealsSelect = {
	id: true,
	intermittentFasting: true,
	meals: {
		select: {
			id: true,
			position: true,
			recipeId: true,
			isManual: true,
			eatenAt: true,
			manualProteinG: true,
			manualCarbsG: true,
			manualFatG: true,
			manualFiberG: true,
			calcProteinG: true,
			calcCarbsG: true,
			calcFatG: true,
			calcFiberG: true,
			recipe: { select: fitRecipeSelect }
		}
	}
} as const;

type DayForEdit = {
	intermittentFasting: boolean;
	meals: (Parameters<typeof fixedDayMacros>[0][number] & {
		id: string;
		position: MealPosition;
		recipe: PlannerMeal['recipe'] | null;
	})[];
};

/**
 * Journée ajustée avec `recipe` au créneau `position` (les autres repas gardent leur recette) :
 * portions des autres repas ajustables et portion du créneau.
 */
function planDayWith(
	day: DayForEdit | null,
	position: MealPosition,
	recipe: PlannerMeal['recipe'],
	targets: MealMacroTargets | null,
	fixedQuantityG: number | null = null
) {
	const others = (day?.meals ?? []).filter((m) => m.position !== position);
	const adjustable = others.filter(isAdjustableMeal);
	const fasting = day?.intermittentFasting ?? false;
	const portions = fitDay({
		meals: [
			...adjustable.map((m) => ({ position: m.position, recipe: m.recipe! })),
			{ position, recipe, fixedQuantityG }
		],
		daily: targets,
		intermittentFasting: fasting,
		fixed: fixedDayMacros(others, fasting)
	});
	return {
		others: adjustable.map((m, k) => ({ id: m.id, portion: portions[k] })),
		slot: portions[portions.length - 1]
	};
}

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const userId = locals.user.id;
	const dayIndex = Number.parseInt(params.day ?? '', 10);
	if (!Number.isInteger(dayIndex) || dayIndex < 1 || dayIndex > TOTAL_DAYS)
		throw error(404, 'Jour invalide');
	// Jour du cycle en cours (URL) → jour absolu de `NutritionDay`.
	const absoluteDay = absoluteDayIndex(await getUserProgramCycle(userId), dayIndex);

	const position = positionFromParam(params.mealNum ?? '');
	if (!position) throw error(404, 'Créneau invalide');

	const category = recipeCategory(position);

	// Aucune de ces requêtes ne dépend d'une autre : une seule vague.
	const [nutritionDay, profile, lastMeasure, catalog, favoriteIds] = await Promise.all([
		prisma.nutritionDay.findUnique({
			where: { userId_dayIndex: { userId, dayIndex: absoluteDay } },
			select: dayMealsSelect
		}),
		prisma.userProfile.findUnique({
			where: { userId },
			select: { ...mealTargetsProfileSelect, allergens: true, otherAllergens: true, disgustingFoods: true }
		}),
		prisma.bodyMeasurement.findFirst({
			where: { userId },
			orderBy: { createdAt: 'desc' },
			select: { weightKg: true }
		}),
		getCatalogRecipes(),
		prisma.userFavoriteRecipe
			.findMany({ where: { userId }, select: { recipeId: true } })
			.then((rows) => rows.map((r) => r.recipeId))
	]);

	const currentMeal = nutritionDay?.meals.find((m) => m.position === position) ?? null;
	const weightKg = lastMeasure?.weightKg ?? null;

	const mealTargets = mealTargetsFromProfile(profile, weightKg);

	const fasting = nutritionDay?.intermittentFasting ?? false;
	const frac = mealBudgetFraction(position, fasting);
	// Chaque recette est proposée avec la journée recalculée autour d'elle (autres repas inchangés).
	// Mêmes exclusions que la génération : allergènes déclarés, allergènes libres, aliments à éviter.
	const recipes = filterRecipesForUser(
		catalog.filter((r) => r.category === category),
		profile
	);
	const recipesWithOptimalQ = recipes.map((full) => {
		const { ingredients } = full;
		const r = {
			id: full.id,
			name: full.name,
			totalTimeMin: full.totalTimeMin,
			nutritionKcal: full.nutritionKcal,
			nutritionProteinG: full.nutritionProteinG,
			nutritionCarbsG: full.nutritionCarbsG,
			nutritionFatG: full.nutritionFatG,
			nutritionFiberG: full.nutritionFiberG,
			referenceYieldG: full.referenceYieldG
		};
		const { slot } = planDayWith(nutritionDay, position, { ...r, ingredients }, mealTargets);
		return {
			...r,
			optimalQuantityG: Math.round(slot.quantityG),
			optimalMacros: {
				kcal: slot.calcCalories,
				proteinG: slot.calcProteinG,
				carbsG: slot.calcCarbsG,
				fatG: slot.calcFatG
			},
			complements: [
				...(slot.extraStarchG != null && slot.extraStarchIngredientName
					? [{ name: slot.extraStarchIngredientName, grams: slot.extraStarchG }]
					: []),
				...slot.complements
			]
		};
	});

	return {
		dayIndex,
		position,
		positionLabel: positionLabel(position),
		nutritionDayId: nutritionDay?.id ?? null,
		currentRecipeId: currentMeal?.recipeId ?? null,
		recipes: recipesWithOptimalQ,
		favoriteIds,
		targetKcal: mealTargets != null ? mealTargets.kcal : null,
		targetProteinG: mealTargets != null ? Math.round(mealTargets.proteinG * 10) / 10 : null,
		frac
	};
};

export const actions: Actions = {
	save: async ({ locals, params, request }) => {
		if (!locals.user) return fail(401, { error: 'Non authentifié' });
		await requireNutritionAccess(locals.user.id, locals.user.role);

		const userId = locals.user.id;
		const dayIndex = Number.parseInt(params.day ?? '', 10);
		if (!Number.isInteger(dayIndex) || dayIndex < 1 || dayIndex > TOTAL_DAYS)
			return fail(400, { error: 'Jour invalide' });
		const absoluteDay = absoluteDayIndex(await getUserProgramCycle(userId), dayIndex);

		const position = positionFromParam(params.mealNum ?? '');
		if (!position) return fail(400, { error: 'Créneau invalide' });

		const formData = await request.formData();
		const recipeId = formData.get('recipeId');
		const quantityGRaw = formData.get('quantityG');

		if (typeof recipeId !== 'string' || !recipeId) return fail(400, { error: 'Recette manquante' });

		const [recipe, mealTargets, day] = await Promise.all([
			prisma.recipe.findUnique({ where: { id: recipeId }, select: fitRecipeSelect }),
			loadUserMealTargets(userId),
			prisma.nutritionDay.findUnique({
				where: { userId_dayIndex: { userId, dayIndex: absoluteDay } },
				select: dayMealsSelect
			})
		]);
		if (!recipe) return fail(404, { error: 'Recette introuvable' });

		// Quantité proposée inchangée : journée ajustée librement ; sinon ce repas garde la quantité choisie
		// et les autres repas du jour sont recalculés autour.
		const proposed = planDayWith(day, position, recipe, mealTargets);
		const requestedG = Number(quantityGRaw);
		const custom =
			quantityGRaw != null &&
			Number.isFinite(requestedG) &&
			Math.round(requestedG) !== Math.round(proposed.slot.quantityG)
				? Math.max(10, Math.round(requestedG))
				: null;
		const plan =
			custom != null ? planDayWith(day, position, recipe, mealTargets, custom) : proposed;

		if (plan.others.length > 0) {
			await prisma.$transaction(
				plan.others.map(({ id, portion }) => prisma.meal.update({ where: { id }, data: portion }))
			);
		}

		let nutritionDay = await prisma.nutritionDay.findUnique({
			where: { userId_dayIndex: { userId, dayIndex: absoluteDay } },
			select: { id: true }
		});
		if (!nutritionDay) {
			nutritionDay = await prisma.nutritionDay.create({
				data: { userId, dayIndex: absoluteDay },
				select: { id: true }
			});
		}

		await upsertMeal({
			nutritionDayId: nutritionDay.id,
			position,
			recipeId,
			...plan.slot
		});

		throw redirect(303, `/user/nutrition/cadencier/${dayIndex}#${position.toLowerCase()}`);
	}
};
