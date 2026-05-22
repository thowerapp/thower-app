import { env } from '$env/dynamic/private';
import {
	QUARTERLY_OFFER_CENTS,
	quarterlyCentsForOffers,
	type OfferForPricing
} from './subscription-offers';

export type PlanId = 'quarterly';

export type SubscriptionPlan = {
	id: PlanId;
	/** Prix en centimes (ex: 50000 = 500 €) */
	amountCents: number;
	/** Durée en mois */
	durationMonths: number;
	label: string;
	description: string;
};

const defaultQuarterlyCents = Number(
	env.STRIPE_PLAN_QUARTERLY_CENTS ?? QUARTERLY_OFFER_CENTS * 2
);

export const SUBSCRIPTION_PLANS: Record<PlanId, SubscriptionPlan> = {
	quarterly: {
		id: 'quarterly',
		amountCents: defaultQuarterlyCents,
		durationMonths: 3,
		label: '3 mois',
		description: 'Accompagnement Thower sur 3 mois.'
	}
};

export type { OfferForPricing };

/**
 * Retourne le plan trimestriel avec le montant = somme des offres sélectionnées (tarif mensuel × 3).
 * Sans sélection valide, montant 0 (le checkout doit refuser).
 */
export function getPlansForOfferSlugs(
	offers: OfferForPricing[],
	selectedSlugs: string[]
): Record<PlanId, SubscriptionPlan> {
	const quarterlyCents =
		selectedSlugs.length > 0 ? quarterlyCentsForOffers(offers, selectedSlugs) : 0;

	const selectedLabels = offers
		.filter((p) => selectedSlugs.includes(p.slug))
		.map((p) => p.name)
		.join(' + ');

	return {
		quarterly: {
			...SUBSCRIPTION_PLANS.quarterly,
			amountCents: quarterlyCents,
			description:
				selectedLabels.length > 0
					? `Accompagnement Thower — ${selectedLabels} — 3 mois.`
					: SUBSCRIPTION_PLANS.quarterly.description
		}
	};
}

/**
 * Calcule la date de fin d'accès pour un plan.
 * @param planId - Formule (quarterly)
 * @param fromDate - Si fourni et dans le futur, la durée est ajoutée à cette date (renouvellement à l'avance). Sinon à partir de maintenant.
 */
export function getSubscriptionEndDateFromPlan(planId: PlanId, fromDate?: Date | null): Date {
	const plan = SUBSCRIPTION_PLANS[planId];
	const base = fromDate && fromDate > new Date() ? new Date(fromDate) : new Date();
	if (!plan) {
		base.setMonth(base.getMonth() + 3);
		return base;
	}
	base.setMonth(base.getMonth() + plan.durationMonths);
	return base;
}
