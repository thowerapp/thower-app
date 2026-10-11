import { prisma } from '$lib/server';

/** Dernière liste de courses de l'utilisateur (la plus récente). */
export async function getCurrentShoppingList(userId: string) {
	return prisma.shoppingList.findFirst({
		where: { userId },
		orderBy: { generatedAt: 'desc' },
		include: { items: true }
	});
}
