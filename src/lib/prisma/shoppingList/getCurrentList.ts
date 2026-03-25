import { prisma } from '$lib/server';

/** Dernière liste de courses de l'utilisateur (la plus récente). */
export async function getCurrentShoppingList(userId: string) {
	const client = prisma as {
		shoppingList?: {
			findFirst: (args: {
				where: { userId: string };
				orderBy: { generatedAt: 'desc' };
				include: { items: true };
			}) => Promise<unknown>;
		};
	};
	if (!client?.shoppingList) return null;
	return client.shoppingList.findFirst({
		where: { userId },
		orderBy: { generatedAt: 'desc' },
		include: { items: true }
	});
}
