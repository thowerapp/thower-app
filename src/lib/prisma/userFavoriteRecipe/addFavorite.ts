import { prisma } from '$lib/server';

export async function addFavoriteRecipe(userId: string, recipeId: string) {
	const client = prisma as {
		userFavoriteRecipe?: {
			create: (args: { data: { userId: string; recipeId: string } }) => Promise<unknown>;
		};
	};
	if (!client?.userFavoriteRecipe) {
		throw new Error('Prisma client has no "userFavoriteRecipe" model. Run: npx prisma generate');
	}
	return client.userFavoriteRecipe.create({
		data: { userId, recipeId }
	});
}
