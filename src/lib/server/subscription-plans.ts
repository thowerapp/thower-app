import { env } from '$env/dynamic/private';

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

const defaultQuarterlyCents = Number(env.STRIPE_PLAN_QUARTERLY_CENTS ?? 50000);

export const SUBSCRIPTION_PLANS: Record<PlanId, SubscriptionPlan> = {
	quarterly: {
		id: 'quarterly',
		amountCents: defaultQuarterlyCents,
		durationMonths: 3,
		label: '3 mois',
		description: 'Accompagnement Thower sur 3 mois.'
	}
};

export type OfferForPricing = {
	slug: string;
	/** Tarif mensuel (centimes) — le trimestriel est calculé comme amountCentsMonthly × 3 */
	amountCentsMonthly: number;
	amountCentsAnnual: number;
};

/**
 * Retourne le plan trimestriel avec le montant = somme des offres sélectionnées (tarif mensuel × 3).
 * Si aucun slug valide ou liste vide, utilise le tarif par défaut (env).
 */
export function getPlansForOfferSlugs(
	offers: OfferForPricing[],
	selectedSlugs: string[]
): Record<PlanId, SubscriptionPlan> {
	const slugsSet = new Set(selectedSlugs);
	const selected = offers.filter((p) => slugsSet.has(p.slug));

	const quarterlyCents =
		selected.length > 0
			? selected.reduce((sum, p) => sum + p.amountCentsMonthly * 3, 0)
			: defaultQuarterlyCents;

	return {
		quarterly: {
			...SUBSCRIPTION_PLANS.quarterly,
			amountCents: quarterlyCents
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
