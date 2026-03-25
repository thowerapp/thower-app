import { prisma } from '$lib/server';

export async function getFavoriteRecipeIds(userId: string): Promise<string[]> {
	const client = prisma as {
		userFavoriteRecipe?: {
			findMany: (args: { where: { userId: string }; select: { recipeId: true } }) => Promise<{ recipeId: string }[]>;
		};
	};
	if (!client?.userFavoriteRecipe) return [];
	const rows = await client.userFavoriteRecipe.findMany({
		where: { userId },
		select: { recipeId: true }
	});
	return rows.map((r) => r.recipeId);
}
