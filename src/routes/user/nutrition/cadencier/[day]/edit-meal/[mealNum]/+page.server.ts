import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server';
import type { MealPosition } from '@prisma/client';
import { upsertMeal } from '$lib/prisma/nutritionDay/upsertMeal';
import {
	targetCaloriesPerDay,
	dailyProteinTargetG
} from '$lib/nutrition/nutritionTargets';
import { breadMacrosForGrams, type BreadTypeValue } from '$lib/schema/profile/breadType';
import {
	MAX_STARCH_G_FRESH,
	computeMealPortion,
	mealBudgetFraction,
	mealMacrosFor,
	mealSlotTargets,
	starchReferenceFor
} from '$lib/nutrition/mealPortion';

const TOTAL_DAYS = 91;

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

function recipeCategory(p: MealPosition): string {
	return p === 'BREAKFAST' ? 'BREAKFAST' : 'MEAL';
}

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const userId = locals.user.id;
	const dayIndex = Number.parseInt(params.day ?? '', 10);
	if (!Number.isInteger(dayIndex) || dayIndex < 1 || dayIndex > TOTAL_DAYS) throw error(404, 'Jour invalide');

	const position = positionFromParam(params.mealNum ?? '');
	if (!position) throw error(404, 'Créneau invalide');

	const category = recipeCategory(position);

	// Aucune de ces requêtes ne dépend d'une autre : une seule vague.
	const [nutritionDay, profile, lastMeasure, recipes, favoriteIds] = await Promise.all([
		prisma.nutritionDay.findUnique({
			where: { userId_dayIndex: { userId, dayIndex } },
			select: {
				id: true,
				intermittentFasting: true,
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
		}),
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
		}),
		prisma.recipe.findMany({
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
				referenceYieldG: true,
				ingredients: {
					select: { name: true, quantityG: true, category: true },
					orderBy: { order: 'asc' }
				}
			},
			orderBy: { name: 'asc' }
		}),
		prisma.userFavoriteRecipe
			.findMany({ where: { userId }, select: { recipeId: true } })
			.then((rows) => rows.map((r) => r.recipeId))
	]);

	const currentMeal = nutritionDay?.meals[0] ?? null;
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
					activityLevel: profile?.activityLevel as import('@prisma/client').ActivityLevel | null
				})
			: null;
	const mealBudgetKcal = targetKcal != null ? Math.max(0, targetKcal - breadKcal) : null;
	const targetProteinG =
		weightKg != null && weightKg > 0 && profile?.bodyFatPercent != null && profile.bodyFatPercent >= 3 && profile.bodyFatPercent <= 70
			? dailyProteinTargetG(weightKg, profile.bodyFatPercent)
			: null;

	const fasting = nutritionDay?.intermittentFasting ?? false;
	const frac = mealBudgetFraction(position, fasting);
	const slot = mealSlotTargets(position, fasting, mealBudgetKcal, targetProteinG);
	const recipesWithOptimalQ = recipes.map(({ ingredients, ...r }) => {
		const portion = computeMealPortion({ ...r, ingredients }, slot);
		return {
			...r,
			optimalQuantityG: Math.round(portion.quantityG),
			extraStarchG: portion.extraStarchG,
			extraStarchIngredientName: portion.extraStarchIngredientName
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
		const extraStarchGRaw = formData.get('extraStarchG');
		const extraStarchNameRaw = formData.get('extraStarchIngredientName');

		if (typeof recipeId !== 'string' || !recipeId) return fail(400, { error: 'Recette manquante' });

		const recipe = await prisma.recipe.findUnique({
			where: { id: recipeId },
			select: {
				nutritionKcal: true,
				nutritionProteinG: true,
				nutritionCarbsG: true,
				nutritionFatG: true,
				nutritionFiberG: true,
				referenceYieldG: true,
				ingredients: { select: { name: true } }
			}
		});
		if (!recipe) return fail(404, { error: 'Recette introuvable' });

		const quantityG = quantityGRaw != null ? Math.max(10, Math.round(Number(quantityGRaw))) : (recipe.referenceYieldG ?? 100);

		// Féculent ajouté proposé par computeMealPortion : accepté seulement s'il s'agit d'un féculent de la recette.
		const extraStarchName =
			typeof extraStarchNameRaw === 'string' &&
			recipe.ingredients.some((i) => i.name === extraStarchNameRaw) &&
			starchReferenceFor(extraStarchNameRaw) != null
				? extraStarchNameRaw
				: null;
		const extraStarchParsed = Number(extraStarchGRaw);
		const extraStarchG =
			extraStarchName && Number.isFinite(extraStarchParsed) && extraStarchParsed > 0
				? Math.min(Math.round(extraStarchParsed), MAX_STARCH_G_FRESH)
				: null;

		const macros = mealMacrosFor(recipe, quantityG, extraStarchG, extraStarchName);

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
			extraStarchG,
			extraStarchIngredientName: extraStarchG != null ? extraStarchName : null,
			...macros
		});

		throw redirect(303, `/user/nutrition/cadencier/${dayIndex}#${position.toLowerCase()}`);
	}
};
