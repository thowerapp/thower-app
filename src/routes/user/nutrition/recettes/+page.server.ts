import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server';
import { NUTRITION_SEGMENT_DAYS } from '$lib/nutrition/nutritionPlanConstants';

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
	const customRecipes = plannedRecipes.filter((r) => r.isCustom && r.userId === userId);

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
		canCreateRecipe: false,
		programDays,
		user: locals.user
	};
};
