import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server';
import type { ActivityLevel, MealPosition } from '@prisma/client';
import { upsertMeal } from '$lib/prisma/nutritionDay/upsertMeal';
import {
	targetCaloriesPerDay,
	dailyProteinTargetG
} from '$lib/nutrition/nutritionTargets';
import { breadMacrosForGrams, type BreadTypeValue } from '$lib/schema/profile/breadType';

const TOTAL_DAYS = 91;
const SCALE_MIN = 0.15;
const SCALE_MAX = 2.5;

function positionFromParam(param: string): MealPosition | null {
	switch (param.toLowerCase()) {
		case 'breakfast': return 'BREAKFAST';
		case 'lunch': return 'LUNCH';
		case 'dinner': return 'DINNER';
		default: return null;
	}
}

function positionLabel(p: MealPosition): string {
	switch (p) {
		case 'BREAKFAST': return 'Petit-déjeuner';
		case 'LUNCH': return 'Déjeuner';
		case 'DINNER': return 'Dîner';
	}
}

function mealBudgetFraction(p: MealPosition): number {
	return p === 'BREAKFAST' ? 0.3 : 0.35;
}

function recipeCategory(p: MealPosition): string {
	return p === 'BREAKFAST' ? 'BREAKFAST' : 'MEAL';
}

function scaleMacros(recipe: {
	nutritionKcal: number | null;
	nutritionProteinG: number | null;
	nutritionCarbsG: number | null;
	nutritionFatG: number | null;
	nutritionFiberG: number | null;
	referenceYieldG: number | null;
}, quantityG: number) {
	const ref = recipe.referenceYieldG != null && recipe.referenceYieldG > 0 ? recipe.referenceYieldG : 100;
	const f = quantityG / ref;
	return {
		calcCalories: recipe.nutritionKcal != null ? recipe.nutritionKcal * f : null,
		calcProteinG: recipe.nutritionProteinG != null ? recipe.nutritionProteinG * f : null,
		calcCarbsG: recipe.nutritionCarbsG != null ? recipe.nutritionCarbsG * f : null,
		calcFatG: recipe.nutritionFatG != null ? recipe.nutritionFatG * f : null,
		calcFiberG: recipe.nutritionFiberG != null ? recipe.nutritionFiberG * f : null
	};
}

function optimalQuantityG(recipe: {
	nutritionKcal: number | null;
	nutritionProteinG: number | null;
	referenceYieldG: number | null;
}, targetKcal: number | null, targetProteinG: number | null, frac: number): number {
	const ref = recipe.referenceYieldG != null && recipe.referenceYieldG > 0 ? recipe.referenceYieldG : 100;
	const baseKcal = recipe.nutritionKcal != null ? recipe.nutritionKcal : 0;
	const baseProtein = recipe.nutritionProteinG != null ? recipe.nutritionProteinG : 0;

	let calorieScale = Number.POSITIVE_INFINITY;
	let proteinScale = Number.POSITIVE_INFINITY;

	if (targetKcal != null && targetKcal > 0 && baseKcal > 0) {
		calorieScale = (targetKcal * frac) / baseKcal;
	}
	if (targetProteinG != null && targetProteinG > 0 && baseProtein > 0) {
		proteinScale = (targetProteinG * frac) / baseProtein;
	}

	const finiteScales = [calorieScale, proteinScale].filter(Number.isFinite);
	let scale = finiteScales.length > 0 ? Math.min(...finiteScales) : 1;
	scale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, scale));
	return Math.round(ref * scale);
}

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const userId = locals.user.id;
	const dayIndex = Number.parseInt(params.day ?? '', 10);
	if (!Number.isInteger(dayIndex) || dayIndex < 1 || dayIndex > TOTAL_DAYS) throw error(404, 'Jour invalide');

	const position = positionFromParam(params.mealNum ?? '');
	if (!position) throw error(404, 'Créneau invalide');

	const nutritionDay = await prisma.nutritionDay.findUnique({
		where: { userId_dayIndex: { userId, dayIndex } },
		select: {
			id: true,
			meals: {
				where: { position },
				select: {
					id: true,
					recipeId: true,
					quantityG: true,
					recipe: { select: { id: true, name: true } }
				}
			}
		}
	});

	const currentMeal = nutritionDay?.meals[0] ?? null;

	const profile = await prisma.userProfile.findUnique({
		where: { userId },
		select: {
			activityLevel: true,
			bodyFatPercent: true,
			weightLossGoalKg: true,
			breadDaily: true,
			breadGramsPerDay: true,
			breadType: true
		}
	});
	const lastMeasure = await prisma.bodyMeasurement.findFirst({
		where: { userId },
		orderBy: { createdAt: 'desc' },
		select: { weightKg: true }
	});
	const weightKg = lastMeasure?.weightKg ?? null;

	let breadKcal = 0;
	if (profile?.breadDaily && profile.breadType && profile.breadGramsPerDay != null && profile.breadGramsPerDay > 0) {
		breadKcal = breadMacrosForGrams(profile.breadType as BreadTypeValue, profile.breadGramsPerDay).kcal;
	}
	const targetKcal =
		weightKg != null && weightKg > 0
			? targetCaloriesPerDay({
					weightKg,
					bodyFatPercent: profile?.bodyFatPercent,
					activityLevel: profile?.activityLevel as ActivityLevel | null | undefined,
					weightLossGoalKg: profile?.weightLossGoalKg
				})
			: null;
	const mealBudgetKcal = targetKcal != null ? Math.max(0, targetKcal - breadKcal) : null;
	const targetProteinG =
		weightKg != null && weightKg > 0 && profile?.bodyFatPercent != null && profile.bodyFatPercent >= 3 && profile.bodyFatPercent <= 70
			? dailyProteinTargetG(weightKg, profile.bodyFatPercent)
			: null;

	const category = recipeCategory(position);
	const recipes = await prisma.recipe.findMany({
		where: { active: true, isCustom: false, category: category as 'BREAKFAST' | 'MEAL' | 'DESSERT' },
		select: {
			id: true,
			name: true,
			totalTimeMin: true,
			nutritionKcal: true,
			nutritionProteinG: true,
			nutritionCarbsG: true,
			nutritionFatG: true,
			nutritionFiberG: true,
			referenceYieldG: true
		},
		orderBy: { name: 'asc' }
	});

	const frac = mealBudgetFraction(position);
	const recipesWithOptimalQ = recipes.map((r) => ({
		...r,
		optimalQuantityG: optimalQuantityG(r, mealBudgetKcal, targetProteinG, frac)
	}));

	const favoriteIds = await prisma.userFavoriteRecipe
		.findMany({ where: { userId }, select: { recipeId: true } })
		.then((rows) => rows.map((r) => r.recipeId));

	return {
		dayIndex,
		position,
		positionLabel: positionLabel(position),
		nutritionDayId: nutritionDay?.id ?? null,
		currentRecipeId: currentMeal?.recipeId ?? null,
		recipes: recipesWithOptimalQ,
		favoriteIds,
		targetKcal: mealBudgetKcal,
		targetProteinG: targetProteinG != null ? Math.round(targetProteinG * 10) / 10 : null,
		frac
	};
};

export const actions: Actions = {
	save: async ({ locals, params, request }) => {
		if (!locals.user) return fail(401, { error: 'Non authentifié' });

		const userId = locals.user.id;
		const dayIndex = Number.parseInt(params.day ?? '', 10);
		if (!Number.isInteger(dayIndex) || dayIndex < 1 || dayIndex > TOTAL_DAYS) return fail(400, { error: 'Jour invalide' });

		const position = positionFromParam(params.mealNum ?? '');
		if (!position) return fail(400, { error: 'Créneau invalide' });

		const formData = await request.formData();
		const recipeId = formData.get('recipeId');
		const quantityGRaw = formData.get('quantityG');

		if (typeof recipeId !== 'string' || !recipeId) return fail(400, { error: 'Recette manquante' });

		const recipe = await prisma.recipe.findUnique({
			where: { id: recipeId },
			select: {
				nutritionKcal: true,
				nutritionProteinG: true,
				nutritionCarbsG: true,
				nutritionFatG: true,
				nutritionFiberG: true,
				referenceYieldG: true
			}
		});
		if (!recipe) return fail(404, { error: 'Recette introuvable' });

		const quantityG = quantityGRaw != null ? Math.max(10, Math.round(Number(quantityGRaw))) : (recipe.referenceYieldG ?? 100);
		const macros = scaleMacros(recipe, quantityG);

		let nutritionDay = await prisma.nutritionDay.findUnique({
			where: { userId_dayIndex: { userId, dayIndex } },
			select: { id: true }
		});
		if (!nutritionDay) {
			nutritionDay = await prisma.nutritionDay.create({
				data: { userId, dayIndex },
				select: { id: true }
			});
		}

		await upsertMeal({
			nutritionDayId: nutritionDay.id,
			position,
			recipeId,
			quantityG,
			...macros
		});

		throw redirect(303, `/user/nutrition/cadencier/${dayIndex}#${position.toLowerCase()}`);
	}
};
