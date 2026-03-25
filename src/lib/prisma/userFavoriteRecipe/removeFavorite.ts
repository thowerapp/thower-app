import { prisma } from '$lib/server';

export async function removeFavoriteRecipe(userId: string, recipeId: string) {
	const client = prisma as {
		userFavoriteRecipe?: {
			deleteMany: (args: { where: { userId: string; recipeId: string } }) => Promise<unknown>;
		};
	};
	if (!client?.userFavoriteRecipe) return;
	await client.userFavoriteRecipe.deleteMany({
		where: { userId, recipeId }
	});
}
