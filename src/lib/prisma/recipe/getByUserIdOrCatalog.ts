import type { Prisma } from '@prisma/client';
import { prisma } from '$lib/server';

export type GetRecipesOptions = {
	/** Si true (défaut), exclut les recettes catalogue désactivées. */
	activeOnly?: boolean;
	/** Inclut les ingrédients (liste de courses, fiches). */
	includeIngredients?: boolean;
};

/**
 * Recettes catalogue admin (`isCustom: false`) + recettes perso de l’utilisateur.
 * Aligné sur la logique de `/user/nutrition/recettes`.
 */
export async function getRecipesByUserIdOrCatalog(
	userId: string,
	options: GetRecipesOptions = {}
) {
	const { activeOnly = true, includeIngredients = false } = options;

	const include: Prisma.RecipeInclude | undefined = includeIngredients
		? { ingredients: true }
		: undefined;

	return prisma.recipe.findMany({
		where: {
			...(activeOnly ? { active: true } : {}),
			OR: [{ isCustom: false }, { userId }]
		},
		...(include ? { include } : {}),
		orderBy: [{ category: 'asc' }, { name: 'asc' }]
	});
}
