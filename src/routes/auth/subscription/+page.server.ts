import { fail, redirect, isRedirect } from '@sveltejs/kit';
import { getBodyMeasurementsByUserId } from '$lib/prisma/bodyMeasurement/getBodyMeasurementsByUserId';
import { getHasValidPaymentByUserId } from '$lib/prisma/transaction/getHasValidPaymentByUserId';
import { getActiveOffers } from '$lib/prisma/offer/getActiveOffers';
import { prisma } from '$lib/server';
import { stripe } from '$lib/server/stripe';
import {
	SUBSCRIPTION_PLANS,
	getPlansForOfferSlugs,
	type PlanId
} from '$lib/server/subscription-plans';

import type { Actions, RequestEvent } from './$types';

export const load = async (event: RequestEvent) => {
	if (event.locals.session === null || event.locals.user === null) {
		return redirect(302, '/auth/login');
	}

	if (!event.locals.user.emailVerified) {
		return redirect(302, '/auth/verify-email');
	}

	const bodyMeasurements = await getBodyMeasurementsByUserId(event.locals.user.id, 1);
	const hasMeasurements = bodyMeasurements.length > 0;
	const offers = await getActiveOffers();
	const defaultPlans = getPlansForOfferSlugs(offers, []);

	const [hasValidPayment, userRow] = await Promise.all([
		getHasValidPaymentByUserId(event.locals.user.id),
		prisma.user.findUnique({
			where: { id: event.locals.user.id },
			select: { subscriptionEndsAt: true }
		})
	]);

	return {
		user: event.locals.user,
		hasMeasurements,
		hasValidPayment,
		subscriptionEndsAt: userRow?.subscriptionEndsAt ?? null,
		offers,
		defaultPlans,
		SUBSCRIPTION_PLANS
	};
};

const VALID_PLANS: PlanId[] = ['monthly', 'annual'];

export const actions: Actions = {
	createCheckout: async (event: RequestEvent) => {
		if (event.locals.session === null || event.locals.user === null) {
			return fail(401, { message: 'Non authentifié' });
		}

		const bodyMeasurements = await getBodyMeasurementsByUserId(event.locals.user.id, 1);
		if (bodyMeasurements.length === 0) {
			return fail(400, { message: 'Profil physique requis avant le paiement' });
		}

		const formData = await event.request.formData();
		const planId = (formData.get('plan') as string | null) ?? 'annual';
		if (!VALID_PLANS.includes(planId as PlanId)) {
			return fail(400, { message: 'Formule invalide' });
		}

		let selectedOfferSlugs: string[] = [];
		const slugsRaw = formData.get('selectedOfferSlugs');
		if (typeof slugsRaw === 'string' && slugsRaw) {
			try {
				selectedOfferSlugs = JSON.parse(slugsRaw) as string[];
			} catch {
				selectedOfferSlugs = [];
			}
		}
		if (!Array.isArray(selectedOfferSlugs)) selectedOfferSlugs = [];

		const offers = await getActiveOffers();
		const validSlugs = new Set(offers.map((p) => p.slug));
		const slugs = selectedOfferSlugs.filter((s) => validSlugs.has(s));

		const plans = getPlansForOfferSlugs(offers, slugs);
		const plan = plans[planId as PlanId];
		const origin = event.url.origin;
		const successUrl = `${origin}/auth/subscription?success=1`;
		const cancelUrl = `${origin}/auth/subscription?canceled=1`;

		try {
			const session = await stripe.checkout.sessions.create({
				mode: 'payment',
				line_items: [
					{
						price_data: {
							currency: 'eur',
							unit_amount: plan.amountCents,
							product_data: {
								name: `Accompagnement Thower - ${plan.label}`,
								description: plan.description
							}
						},
						quantity: 1
					}
				],
				success_url: successUrl,
				cancel_url: cancelUrl,
				client_reference_id: event.locals.user.id,
				customer_email: event.locals.user.email ?? undefined,
				metadata: {
					plan: planId,
					userId: event.locals.user.id,
					offerSlugs: slugs.length > 0 ? JSON.stringify(slugs) : ''
				}
			});

			if (session.url) {
				return redirect(303, session.url);
			}
			return fail(500, { message: 'Impossible de créer la session de paiement' });
		} catch (err) {
			if (isRedirect(err)) throw err;
			console.error('Stripe checkout error:', err);
			return fail(500, { message: 'Erreur lors de la création du paiement' });
		}
	}
};
