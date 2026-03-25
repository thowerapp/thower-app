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

const defaultMonthlyCents = Number(env.STRIPE_PLAN_MONTHLY_CENTS ?? 2900);
const defaultAnnualCents = Number(env.STRIPE_PLAN_ANNUAL_CENTS ?? 9900);

/**
 * Offres d'abonnement (tarifs par défaut). Les montants sont configurables via les variables d'environnement.
 * Pour des tarifs selon le programme (nutrition / sport / les deux), utiliser getPlansForProgram().
 * Exemple .env :
 *   STRIPE_PLAN_MONTHLY_CENTS=2900   (29 €/mois)
 *   STRIPE_PLAN_ANNUAL_CENTS=9900    (99 €/an)
 *   STRIPE_PLAN_MONTHLY_NUTRITION_CENTS=2400
 *   STRIPE_PLAN_MONTHLY_SPORT_CENTS=2400
 *   STRIPE_PLAN_MONTHLY_BOTH_CENTS=2900
 *   STRIPE_PLAN_ANNUAL_NUTRITION_CENTS=7900
 *   STRIPE_PLAN_ANNUAL_SPORT_CENTS=7900
 *   STRIPE_PLAN_ANNUAL_BOTH_CENTS=9900
 */
export const SUBSCRIPTION_PLANS: Record<PlanId, SubscriptionPlan> = {
	monthly: {
		id: 'monthly',
		amountCents: defaultMonthlyCents,
		durationMonths: 1,
		label: 'Mensuel',
		description: 'Accès accompagnement, facturé chaque mois.'
	},
	annual: {
		id: 'annual',
		amountCents: defaultAnnualCents,
		durationMonths: 12,
		label: 'Annuel',
		description: 'Accès accompagnement 1 an, tarif avantageux.'
	}
};

export type OfferForPricing = {
	slug: string;
	amountCentsMonthly: number;
	amountCentsAnnual: number;
};

/**
 * Retourne les plans (mensuel/annuel) avec les montants = somme des offres sélectionnées.
 * Si aucun slug valide ou liste vide, utilise les tarifs par défaut (env).
 */
export function getPlansForOfferSlugs(
	offers: OfferForPricing[],
	selectedSlugs: string[]
): Record<PlanId, SubscriptionPlan> {
	const slugsSet = new Set(selectedSlugs);
	const selected = offers.filter((p) => slugsSet.has(p.slug));

	let monthlyCents = defaultMonthlyCents;
	let annualCents = defaultAnnualCents;
	if (selected.length > 0) {
		monthlyCents = selected.reduce((sum, p) => sum + p.amountCentsMonthly, 0);
		annualCents = selected.reduce((sum, p) => sum + p.amountCentsAnnual, 0);
	}

	return {
		monthly: {
			...SUBSCRIPTION_PLANS.monthly,
			amountCents: monthlyCents
		},
		annual: {
			...SUBSCRIPTION_PLANS.annual,
			amountCents: annualCents
		}
	};
}

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
