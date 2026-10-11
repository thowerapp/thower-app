import { prisma } from '$lib/server';

export async function addFavoriteRecipe(userId: string, recipeId: string) {
	return prisma.userFavoriteRecipe.create({ data: { userId, recipeId } });
}
