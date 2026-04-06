import { prisma } from '$lib/server/index';

/**
 * Réserve le crédit nutrition pour une Transaction (une fois par session Stripe).
 * Utilise un update MongoDB natif : Prisma `updateMany({ nutritionSegmentCreditedAt: null })`
 * ne matche pas toujours les documents où le champ est absent (comportement observé en prod).
 */
export async function claimNutritionSegmentCreditOnTransaction(transactionId: string): Promise<boolean> {
	const result = await prisma.$runCommandRaw({
		update: 'transactions',
		updates: [
			{
				q: {
					_id: { $oid: transactionId },
					$or: [
						{ nutritionSegmentCreditedAt: { $exists: false } },
						{ nutritionSegmentCreditedAt: null }
					]
				},
				u: { $currentDate: { nutritionSegmentCreditedAt: true } },
				multi: false
			}
		]
	});

	const r = result as { nModified?: number; modifiedCount?: number; n?: number };
	const n = r.nModified ?? r.modifiedCount ?? r.n ?? 0;
	return n > 0;
}
