import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
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

	const firstThreeMonthsRecipes = allRecipes.filter(r => r.category === 'FIRST_3_MONTHS' && !r.isCustom);
	const newRecipes = allRecipes.filter(r => r.category === 'NEW' && !r.isCustom);
	const customRecipes = allRecipes.filter(r => r.isCustom && r.userId === locals.user.id);

	// Get user's favorite recipes
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
		firstThreeMonthsRecipes,
		newRecipes,
		customRecipes,
		favoriteRecipes: favoriteRecipes.map(f => f.recipe),
		user: locals.user
	};
};
