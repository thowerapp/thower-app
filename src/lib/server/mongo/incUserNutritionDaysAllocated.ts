import { prisma } from '$lib/server/index';

/**
 * Incrémente `nutritionDaysAllocated` en MongoDB natif (`$inc`).
 * Contourne un cas observé où `prisma.user.update({ increment })` met à jour
 * `subscriptionEndsAt` mais pas le compteur nutrition sur la même opération.
 */
export async function incUserNutritionDaysAllocatedMongo(
	userId: string,
	delta: number
): Promise<{ modified: number }> {
	const result = await prisma.$runCommandRaw({
		update: 'User',
		updates: [
			{
				q: { _id: { $oid: userId } },
				u: { $inc: { nutritionDaysAllocated: delta } },
				multi: false
			}
		]
	});

	const r = result as { nModified?: number; modifiedCount?: number; n?: number };
	const n = r.nModified ?? r.modifiedCount ?? r.n ?? 0;
	return { modified: n };
}
