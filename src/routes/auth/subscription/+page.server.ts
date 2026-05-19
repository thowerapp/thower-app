import { fail, redirect, isRedirect } from '@sveltejs/kit';
import { getBodyMeasurementsByUserId } from '$lib/prisma/bodyMeasurement/getBodyMeasurementsByUserId';
import { getHasValidPaymentByUserId } from '$lib/prisma/transaction/getHasValidPaymentByUserId';
import { getProgramOfferEntitlements } from '$lib/prisma/transaction/getProgramOfferEntitlements';
import { prisma } from '$lib/server';
import { stripe } from '$lib/server/stripe';
import { scheduleProgramGenerationAfterPayment } from '$lib/server/program-generation';
import { dispatchProgramGeneration } from '$lib/server/program-generation/dispatchProgramGeneration';
import { programGenTrace } from '$lib/server/program-generation/programGenerationLog';
import { getProgramOffers } from '$lib/server/subscription-offers';
import { SUBSCRIPTION_PLANS, getPlansForOfferSlugs } from '$lib/server/subscription-plans';
import {
	reconcileCheckoutSessionForUser,
	syncRecentPaidCheckoutSessionsForUser
} from '$lib/server/stripe/reconcileCheckoutSession';
import { logPaymentStatus, onboardingTrace } from '$lib/server/onboarding/onboardingLog';

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

	const offers = await getProgramOffers();
	const userId = event.locals.user.id;

	// Retour Stripe : rattraper la transaction si le webhook n’a pas encore tourné.
	const success = event.url.searchParams.get('success') === '1';
	const stripeSessionId = event.url.searchParams.get('session_id');
	let reconcileOutcome: 'skipped' | 'session_id' | 'sync_list' | 'failed' = 'skipped';

	if (success) {
		await logPaymentStatus(userId, 'subscription', 'stripe_return_before_reconcile');
		if (stripeSessionId) {
			reconcileOutcome = 'session_id';
			const reconciled = await reconcileCheckoutSessionForUser(stripeSessionId, userId, 'return_url');
			onboardingTrace('stripe_reconcile', {
				userId,
				source: 'subscription',
				method: 'session_id',
				stripeSessionId,
				reconciled
			});
		} else {
			reconcileOutcome = 'sync_list';
			const synced = await syncRecentPaidCheckoutSessionsForUser(userId);
			onboardingTrace('stripe_reconcile', {
				userId,
				source: 'subscription',
				method: 'sync_list',
				reconciled: synced
			});
		}
		await logPaymentStatus(userId, 'subscription', 'stripe_return_after_reconcile');
	}

	const [hasValidPayment, userRow, entitlements] = await Promise.all([
		getHasValidPaymentByUserId(event.locals.user.id),
		prisma.user.findUnique({
			where: { id: event.locals.user.id },
			select: { subscriptionEndsAt: true }
		}),
		getProgramOfferEntitlements(event.locals.user.id)
	]);

	// Retour Stripe : mensurations déjà faites avant paiement → relancer la génération ici.
	if (success) {
		const { role } = event.locals.user;
		const isAdmin = role === 'ADMIN';
		const redirectTo = hasMeasurements ? '/user' : '/auth/measurement';

		if (hasMeasurements && (hasValidPayment || isAdmin)) {
			const dispatchMode = await dispatchProgramGeneration(event, () =>
				scheduleProgramGenerationAfterPayment(userId, { role, source: 'subscription' })
			);
			onboardingTrace('subscription_load', {
				userId,
				source: 'subscription',
				outcome: 'stripe_return_ok',
				reconcileOutcome,
				isAdmin,
				hasValidPayment,
				hasMeasurements,
				entitlements,
				action: 'schedule_generation',
				dispatchMode,
				redirectTo
			});
			programGenTrace('trigger', {
				userId,
				source: 'subscription',
				isAdmin,
				hasValidPayment,
				hasMeasurements,
				action: 'schedule_generation_after_checkout',
				dispatchMode
			});
		} else {
			onboardingTrace('subscription_load', {
				userId,
				source: 'subscription',
				outcome: 'stripe_return_incomplete',
				reconcileOutcome,
				isAdmin,
				hasValidPayment,
				hasMeasurements,
				entitlements,
				reason: hasMeasurements ? 'payment_not_valid' : 'missing_measurements',
				redirectTo
			});
			programGenTrace('schedule_denied', {
				userId,
				source: 'subscription',
				isAdmin,
				hasValidPayment,
				hasMeasurements,
				reason: hasMeasurements
					? 'payment_not_valid'
					: 'missing_measurements_redirect_measurement'
			});
		}
		return redirect(302, redirectTo);
	}

	onboardingTrace('subscription_load', {
		userId,
		source: 'subscription',
		hasMeasurements,
		hasValidPayment,
		subscriptionEndsAt: userRow?.subscriptionEndsAt?.toISOString() ?? null,
		entitlements,
		offerCount: offers.length
	});

	return {
		user: event.locals.user,
		hasMeasurements,
		hasValidPayment,
		subscriptionEndsAt: userRow?.subscriptionEndsAt ?? null,
		offers,
		SUBSCRIPTION_PLANS,
		entitlements
	};
};

export const actions: Actions = {
	createCheckout: async (event: RequestEvent) => {
		if (event.locals.session === null || event.locals.user === null) {
			return fail(401, { message: 'Non authentifié' });
		}

		let selectedOfferSlugs: string[] = [];
		const formData = await event.request.formData();
		const slugsRaw = formData.get('selectedOfferSlugs');
		if (typeof slugsRaw === 'string' && slugsRaw) {
			try {
				selectedOfferSlugs = JSON.parse(slugsRaw) as string[];
			} catch {
				selectedOfferSlugs = [];
			}
		}
		if (!Array.isArray(selectedOfferSlugs)) selectedOfferSlugs = [];

		const offers = await getProgramOffers();
		const validSlugs = new Set(offers.map((p) => p.slug));
		const slugs = selectedOfferSlugs.filter((s) => validSlugs.has(s));

		if (slugs.length === 0) {
			onboardingTrace('subscription_checkout', {
				userId: event.locals.user.id,
				source: 'subscription',
				outcome: 'validation_failed',
				reason: 'no_offer_selected'
			});
			return fail(400, {
				message: 'Sélectionnez au moins un programme : Nutrition et/ou Sport.'
			});
		}

		const plan = getPlansForOfferSlugs(offers, slugs).quarterly;
		if (plan.amountCents < 1) {
			return fail(400, { message: 'Montant invalide pour la sélection.' });
		}

		const origin = event.url.origin;
		const successUrl = `${origin}/auth/subscription?success=1&session_id={CHECKOUT_SESSION_ID}`;
		const cancelUrl = `${origin}/auth/subscription?canceled=1`;

		const selectedOffers = offers.filter((o) => slugs.includes(o.slug));

		try {
			const session = await stripe.checkout.sessions.create({
				mode: 'payment',
				line_items: selectedOffers.map((offer) => ({
					price_data: {
						currency: 'eur',
						unit_amount: offer.amountCentsMonthly * 3,
						product_data: {
							name: `Accompagnement Thower — ${offer.name}`,
							description: `${offer.name} — 3 mois d'accompagnement`
						}
					},
					quantity: 1
				})),
				success_url: successUrl,
				cancel_url: cancelUrl,
				client_reference_id: event.locals.user.id,
				customer_email: event.locals.user.email ?? undefined,
				metadata: {
					plan: 'quarterly',
					userId: event.locals.user.id,
					offerSlugs: JSON.stringify(slugs)
				}
			});

			if (session.url) {
				onboardingTrace('subscription_checkout', {
					userId: event.locals.user.id,
					source: 'subscription',
					outcome: 'stripe_session_created',
					stripeSessionId: session.id,
					offerSlugs: slugs,
					amountCents: plan.amountCents
				});
				return redirect(303, session.url);
			}
			onboardingTrace('subscription_checkout', {
				userId: event.locals.user.id,
				source: 'subscription',
				outcome: 'failed',
				reason: 'no_checkout_url'
			});
			return fail(500, { message: 'Impossible de créer la session de paiement' });
		} catch (err) {
			if (isRedirect(err)) throw err;
			onboardingTrace('subscription_checkout', {
				userId: event.locals.user.id,
				source: 'subscription',
				outcome: 'failed',
				error: err instanceof Error ? err.message : String(err)
			});
			console.error('Stripe checkout error:', err);
			return fail(500, { message: 'Erreur lors de la création du paiement' });
		}
	}
};
