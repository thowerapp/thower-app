import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server';
import { addFavoriteRecipe } from '$lib/prisma/userFavoriteRecipe/addFavorite';
import { removeFavoriteRecipe } from '$lib/prisma/userFavoriteRecipe/removeFavorite';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) throw redirect(302, '/auth/login');
	const userId = locals.user.id;

	const recipe = await prisma.recipe.findFirst({
		where: {
			id: params.id,
			active: true,
			OR: [{ isCustom: false }, { userId }]
		},
		include: {
			ingredients: { orderBy: { order: 'asc' } }
		}
	});

	if (!recipe) throw error(404, 'Recette introuvable');

	const fav = await prisma.userFavoriteRecipe.findFirst({
		where: { userId, recipeId: params.id }
	});

	return { recipe, isFavorite: !!fav };
};

export const actions: Actions = {
	toggleFavorite: async ({ locals, params }) => {
		if (!locals.user) return fail(401, { error: 'Non authentifié' });
		const userId = locals.user.id;
		const recipeId = params.id;

		const existing = await prisma.userFavoriteRecipe.findFirst({
			where: { userId, recipeId }
		});

		try {
			if (existing) {
				await removeFavoriteRecipe(userId, recipeId);
			} else {
				await addFavoriteRecipe(userId, recipeId);
			}
			return { success: true };
		} catch {
			return fail(500, { error: 'Erreur serveur' });
		}
	}
};
