import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server';
import { NUTRITION_SEGMENT_DAYS } from '$lib/nutrition/nutritionPlanConstants';
import { addFavoriteRecipe } from '$lib/prisma/userFavoriteRecipe/addFavorite';
import { removeFavoriteRecipe } from '$lib/prisma/userFavoriteRecipe/removeFavorite';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/auth/login');
	}
	const userId = locals.user.id;

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { nutritionDaysAllocated: true }
	});
	const programDays = Math.max(user?.nutritionDaysAllocated ?? 0, NUTRITION_SEGMENT_DAYS);

	const plannedMeals = await prisma.meal.findMany({
		where: {
			nutritionDay: {
				userId,
				dayIndex: { gte: 1, lte: programDays }
			}
		},
		select: { recipeId: true },
		distinct: ['recipeId']
	});

	const plannedRecipeIds = plannedMeals
		.map((m) => m.recipeId)
		.filter((id): id is string => typeof id === 'string' && id.length > 0);

	const plannedRecipes = await prisma.recipe.findMany({
		where: {
			id: { in: plannedRecipeIds },
			active: true,
			OR: [
				{ isCustom: false },
				{ userId }
			]
		},
		include: {
			ingredients: true
		}
	});

	const breakfastRecipes = plannedRecipes.filter((r) => r.category === 'BREAKFAST' && !r.isCustom);
	const mealRecipes = plannedRecipes.filter((r) => r.category === 'MEAL' && !r.isCustom);
	const dessertRecipes = plannedRecipes.filter((r) => r.category === 'DESSERT' && !r.isCustom);
	const customRecipes = await prisma.recipe.findMany({
		where: {
			userId,
			isCustom: true,
			active: true
		},
		orderBy: { updatedAt: 'desc' },
		select: {
			id: true,
			name: true,
			category: true,
			totalTimeMin: true
		}
	});

	const favoriteRecipes = await prisma.userFavoriteRecipe.findMany({
		where: { userId },
		include: {
			recipe: {
				include: {
					ingredients: true
				}
			}
		}
	});

	return {
		breakfastRecipes,
		mealRecipes,
		dessertRecipes,
		customRecipes,
		programRecipes: plannedRecipes,
		favoriteRecipes: favoriteRecipes
			.map((f) => f.recipe)
			.filter((r) => plannedRecipeIds.includes(r.id)),
		canCreateRecipe: true,
		programDays,
		user: locals.user
	};
};

export const actions: Actions = {
	toggleFavorite: async ({ locals, request }) => {
		if (!locals.user) return fail(401, { error: 'Non authentifié' });
		const userId = locals.user.id;
		const data = await request.formData();
		const recipeId = data.get('recipeId');
		const action = data.get('action');
		if (typeof recipeId !== 'string' || !recipeId) return fail(400, { error: 'recipeId manquant' });
		try {
			if (action === 'add') {
				await addFavoriteRecipe(userId, recipeId);
			} else {
				await removeFavoriteRecipe(userId, recipeId);
			}
			return { success: true };
		} catch {
			return fail(500, { error: 'Erreur serveur' });
		}
	}
};
