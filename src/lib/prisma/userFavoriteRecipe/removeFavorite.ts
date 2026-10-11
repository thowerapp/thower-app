import { prisma } from '$lib/server';

export async function removeFavoriteRecipe(userId: string, recipeId: string) {
	await prisma.userFavoriteRecipe.deleteMany({ where: { userId, recipeId } });
}
