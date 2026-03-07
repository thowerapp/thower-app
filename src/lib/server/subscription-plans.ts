import { env } from '$env/dynamic/private';

export type PlanId = 'monthly' | 'annual';

export type SubscriptionPlan = {
	id: PlanId;
	/** Prix en centimes (ex: 2900 = 29 €) */
	amountCents: number;
	/** Durée en mois (1 = mensuel, 12 = annuel) */
	durationMonths: number;
	label: string;
	description: string;
};

/**
 * Offres d'abonnement. Les montants sont configurables via les variables d'environnement.
 * Exemple .env :
 *   STRIPE_PLAN_MONTHLY_CENTS=2900   (29 €/mois)
 *   STRIPE_PLAN_ANNUAL_CENTS=9900    (99 €/an)
 */
export const SUBSCRIPTION_PLANS: Record<PlanId, SubscriptionPlan> = {
	monthly: {
		id: 'monthly',
		amountCents: Number(env.STRIPE_PLAN_MONTHLY_CENTS ?? 2900),
		durationMonths: 1,
		label: 'Mensuel',
		description: 'Accès accompagnement, facturé chaque mois.'
	},
	annual: {
		id: 'annual',
		amountCents: Number(env.STRIPE_PLAN_ANNUAL_CENTS ?? 9900),
		durationMonths: 12,
		label: 'Annuel',
		description: 'Accès accompagnement 1 an, tarif avantageux.'
	}
};

/**
 * Calcule la date de fin d'accès pour un plan.
 * @param planId - Formule (monthly / annual)
 * @param fromDate - Si fourni et dans le futur, la durée est ajoutée à cette date (renouvellement à l'avance). Sinon à partir de maintenant.
 */
export function getSubscriptionEndDateFromPlan(planId: PlanId, fromDate?: Date | null): Date {
	const plan = SUBSCRIPTION_PLANS[planId];
	const base = fromDate && fromDate > new Date() ? new Date(fromDate) : new Date();
	if (!plan) {
		base.setFullYear(base.getFullYear() + 1);
		return base;
	}
	base.setMonth(base.getMonth() + plan.durationMonths);
	return base;
}
