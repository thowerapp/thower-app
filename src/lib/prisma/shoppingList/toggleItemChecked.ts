import { prisma } from '$lib/server';

export async function toggleShoppingItemChecked(itemId: string, isChecked: boolean) {
	const client = prisma as {
		shoppingItem?: {
			update: (args: { where: { id: string }; data: { isChecked: boolean } }) => Promise<unknown>;
		};
	};
	if (!client?.shoppingItem) {
		throw new Error('Prisma client has no "shoppingItem" model. Run: npx prisma generate');
	}
	return client.shoppingItem.update({
		where: { id: itemId },
		data: { isChecked }
	});
}
