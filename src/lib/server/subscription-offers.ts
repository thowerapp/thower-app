import { env } from '$env/dynamic/private';
import { getActiveOffers, type OfferRow } from '$lib/prisma/offer/getActiveOffers';

/** Prix trimestriel par programme (Nutrition ou Sport), en centimes — ex. 25000 = 250 € / 3 mois */
export const QUARTERLY_OFFER_CENTS = Number(env.STRIPE_PLAN_QUARTERLY_OFFER_CENTS ?? 25000);
export const OFFER_MONTHLY_CENTS = Math.round(QUARTERLY_OFFER_CENTS / 3);

export const PROGRAM_OFFER_SLUGS = ['nutrition', 'sport'] as const;
export type ProgramOfferSlug = (typeof PROGRAM_OFFER_SLUGS)[number];

export type OfferForPricing = {
	slug: string;
	name: string;
	/** Tarif mensuel (centimes) — le trimestriel = amountCentsMonthly × 3 */
	amountCentsMonthly: number;
	amountCentsAnnual: number;
};

const DEFAULT_PROGRAM_OFFERS: OfferRow[] = [
	{
		id: 'default-nutrition',
		slug: 'nutrition',
		name: 'Nutrition',
		amountCentsMonthly: OFFER_MONTHLY_CENTS,
		amountCentsAnnual: QUARTERLY_OFFER_CENTS * 4,
		active: true,
		order: 0
	},
	{
		id: 'default-sport',
		slug: 'sport',
		name: 'Sport',
		amountCentsMonthly: OFFER_MONTHLY_CENTS,
		amountCentsAnnual: QUARTERLY_OFFER_CENTS * 4,
		active: true,
		order: 1
	}
];

/** Offres Nutrition + Sport (DB admin ou valeurs par défaut 250 € / programme / trimestre). */
export async function getProgramOffers(): Promise<OfferRow[]> {
	const fromDb = await getActiveOffers();
	return PROGRAM_OFFER_SLUGS.map((slug) => {
		const row = fromDb.find((o) => o.slug === slug);
		return row ?? DEFAULT_PROGRAM_OFFERS.find((o) => o.slug === slug)!;
	});
}

export function quarterlyCentsForOffers(offers: OfferRow[], selectedSlugs: string[]): number {
	const slugsSet = new Set(selectedSlugs);
	return offers
		.filter((o) => slugsSet.has(o.slug))
		.reduce((sum, o) => sum + o.amountCentsMonthly * 3, 0);
}
