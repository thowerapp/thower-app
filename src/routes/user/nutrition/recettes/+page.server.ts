import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/auth/login');
	}

	// Get all recipe categories with counts
	const allRecipes = await prisma.recipe.findMany({
		where: {
			active: true,
			OR: [
				{ isCustom: false },
				{ userId: locals.user.id }
			]
		},
		include: {
			ingredients: true
		}
	});

	const breakfastRecipes = allRecipes.filter(r => r.category === 'BREAKFAST' && !r.isCustom);
	const mealRecipes = allRecipes.filter(r => r.category === 'MEAL' && !r.isCustom);
	const dessertRecipes = allRecipes.filter(r => r.category === 'DESSERT' && !r.isCustom);
	const customRecipes = allRecipes.filter(r => r.isCustom && r.userId === locals.user.id);

	const favoriteRecipes = await prisma.userFavoriteRecipe.findMany({
		where: { userId: locals.user.id },
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
		favoriteRecipes: favoriteRecipes.map(f => f.recipe),
		user: locals.user
	};
};
