import { prisma } from '$lib/server';

export type OfferRow = {
	id: string;
	slug: string;
	name: string;
	amountCentsMonthly: number;
	amountCentsAnnual: number;
	active: boolean;
	order: number;
};

export async function getActiveOffers(): Promise<OfferRow[]> {
	if (!prisma?.offer) {
		console.warn('[getActiveOffers] prisma.offer is undefined. Run: npx prisma generate');
		return [];
	}
	const rows = await prisma.offer.findMany({
		where: { active: true },
		orderBy: { order: 'asc' },
		select: {
			id: true,
			slug: true,
			name: true,
			amountCentsMonthly: true,
			amountCentsAnnual: true,
			active: true,
			order: true
		}
	});
	return rows as OfferRow[];
}
