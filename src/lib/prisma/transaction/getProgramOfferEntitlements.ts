import { prisma } from '$lib/server';

const NUTRITION = 'nutrition';
const SPORT = 'sport';

/**
 * Droits d’accès aux programmes selon les offres achetées (`Transaction.offerSlugs`).
 * Anciens paiements sans métadonnées → les deux programmes (rétrocompatibilité).
 */
export async function getProgramOfferEntitlements(userId: string): Promise<{
	nutrition: boolean;
	sport: boolean;
}> {
	const txs = await prisma.transaction.findMany({
		where: { userId, status: 'paid' },
		select: { offerSlugs: true }
	});
	const slugs = new Set(txs.flatMap((t) => t.offerSlugs ?? []));
	if (slugs.size === 0) {
		return { nutrition: true, sport: true };
	}
	return {
		nutrition: slugs.has(NUTRITION),
		sport: slugs.has(SPORT)
	};
}
