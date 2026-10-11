import { prisma } from '$lib/server';

export async function getFavoriteRecipeIds(userId: string): Promise<string[]> {
	const rows = await prisma.userFavoriteRecipe.findMany({ where: { userId }, select: { recipeId: true } });
	return rows.map((r) => r.recipeId);
}
