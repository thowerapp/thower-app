import { prisma } from '$lib/server';

export async function toggleShoppingItemChecked(itemId: string, isChecked: boolean) {
	return prisma.shoppingItem.update({
		where: { id: itemId },
		data: { isChecked }
	});
}
