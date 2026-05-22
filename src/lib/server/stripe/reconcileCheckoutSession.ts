import type { Prisma } from '@prisma/client';
import type Stripe from 'stripe';
import { prisma } from '$lib/server';
import { stripe } from '$lib/server/stripe';
import { createTransactionFromStripeSession } from '$lib/prisma/transaction/createTransactionFromStripeSession';
import { getHasValidPaymentByUserId } from '$lib/prisma/transaction/getHasValidPaymentByUserId';
import { getBodyMeasurementsByUserId } from '$lib/prisma/bodyMeasurement/getBodyMeasurementsByUserId';
import { getSubscriptionEndDateFromPlan, type PlanId } from '$lib/server/subscription-plans';
import { claimNutritionSegmentCreditOnTransaction } from '$lib/server/mongo/claimNutritionSegmentCredit';
import { incUserNutritionDaysAllocatedMongo } from '$lib/server/mongo/incUserNutritionDaysAllocated';
import { scheduleProgramGenerationAfterPayment } from '$lib/server/program-generation';
import { programGenTrace } from '$lib/server/program-generation/programGenerationLog';
import { NUTRITION_SEGMENT_DAYS } from '$lib/nutrition/nutritionPlanConstants';
import { logPaymentStatus, onboardingTrace } from '$lib/server/onboarding/onboardingLog';

const VALID_PLANS: PlanId[] = ['quarterly'];

type UserNutritionAllocatedRow = { nutritionDaysAllocated: number };

const selectNutritionDaysAllocated = {
	nutritionDaysAllocated: true
} as unknown as Prisma.UserSelect;

export type CheckoutReconcileSource = 'webhook' | 'return_url' | 'measurement_sync';

function sessionUserId(session: Stripe.Checkout.Session): string | null {
	return session.metadata?.userId ?? session.client_reference_id ?? null;
}

/**
 * Crée la transaction si besoin, prolonge l’abo et crédite la nutrition (idempotent).
 * Utilisé par le webhook Stripe et le rattrapage côté serveur (retour checkout / measurement).
 */
export async function reconcilePaidCheckoutSession(
	session: Stripe.Checkout.Session,
	source: CheckoutReconcileSource
): Promise<boolean> {
	const checkoutUserId = sessionUserId(session) ?? undefined;
	programGenTrace('trigger', {
		source,
		action: 'checkout.session.reconcile',
		sessionId: session.id,
		paymentStatus: session.payment_status,
		...(checkoutUserId ? { userId: checkoutUserId } : {})
	});

	if (session.payment_status !== 'paid') {
		onboardingTrace('stripe_reconcile', {
			userId: checkoutUserId,
			source: 'stripe',
			outcome: 'skipped',
			reconcileSource: source,
			sessionId: session.id,
			paymentStatus: session.payment_status,
			reason: 'not_paid'
		});
		return false;
	}

	let transaction = await prisma.transaction.findUnique({
		where: { stripePaymentId: session.id }
	});

	if (!transaction) {
		transaction = await createTransactionFromStripeSession(session);
		onboardingTrace('stripe_reconcile', {
			userId: transaction.userId ?? checkoutUserId,
			source: 'stripe',
			outcome: 'transaction_created',
			reconcileSource: source,
			sessionId: session.id,
			transactionId: transaction.id
		});
	} else if (transaction.status !== 'paid') {
		transaction = await prisma.transaction.update({
			where: { id: transaction.id },
			data: { status: 'paid' }
		});
	}

	if (!transaction.userId) {
		onboardingTrace('stripe_reconcile', {
			source: 'stripe',
			outcome: 'failed',
			reconcileSource: source,
			sessionId: session.id,
			reason: 'missing_user_id'
		});
		return false;
	}

	const planId = (session.metadata?.plan as PlanId | undefined) ?? 'quarterly';
	const offerSlugs = transaction.offerSlugs ?? [];
	const includesNutrition = offerSlugs.length === 0 || offerSlugs.includes('nutrition');

	const user = await prisma.user.findUnique({
		where: { id: transaction.userId },
		select: { subscriptionEndsAt: true }
	});
	const currentEndsAt = user?.subscriptionEndsAt ?? null;
	const endsAt = VALID_PLANS.includes(planId)
		? getSubscriptionEndDateFromPlan(planId, currentEndsAt)
		: getSubscriptionEndDateFromPlan('quarterly', currentEndsAt);

	const credited = await claimNutritionSegmentCreditOnTransaction(transaction.id);

	if (!credited) {
		onboardingTrace('stripe_reconcile', {
			userId: transaction.userId,
			source: 'stripe',
			outcome: 'already_credited',
			reconcileSource: source,
			sessionId: session.id
		});
		return getHasValidPaymentByUserId(transaction.userId);
	}

	await prisma.user.update({
		where: { id: transaction.userId },
		data: { subscriptionEndsAt: endsAt }
	});

	if (includesNutrition) {
		const { modified } = await incUserNutritionDaysAllocatedMongo(
			transaction.userId,
			NUTRITION_SEGMENT_DAYS
		);
		if (modified < 1) {
			const u = (await prisma.user.findUnique({
				where: { id: transaction.userId },
				select: selectNutritionDaysAllocated
			})) as UserNutritionAllocatedRow | null;
			const base = u?.nutritionDaysAllocated ?? 0;
			await prisma.user.update({
				where: { id: transaction.userId },
				data: {
					nutritionDaysAllocated: base + NUTRITION_SEGMENT_DAYS
				} as unknown as Prisma.UserUpdateInput
			});
		}
	}

	const measurements = await getBodyMeasurementsByUserId(transaction.userId, 1);
	if (measurements.length > 0) {
		await scheduleProgramGenerationAfterPayment(transaction.userId, {
			source: source === 'webhook' ? 'webhook' : 'internal'
		});
	}

	const valid = await getHasValidPaymentByUserId(transaction.userId);
	await logPaymentStatus(transaction.userId, 'stripe', `reconcile_done_${source}`);
	onboardingTrace('stripe_reconcile', {
		userId: transaction.userId,
		source: 'stripe',
		outcome: 'credited',
		reconcileSource: source,
		sessionId: session.id,
		offerSlugs,
		includesNutrition,
		subscriptionEndsAt: endsAt.toISOString(),
		hasMeasurements: measurements.length > 0,
		hasValidPayment: valid
	});

	return valid;
}

/** Rattrapage via l’ID de session Stripe (retour success_url). */
export async function reconcileCheckoutSessionForUser(
	sessionId: string,
	userId: string,
	source: CheckoutReconcileSource = 'return_url'
): Promise<boolean> {
	try {
		const session = await stripe.checkout.sessions.retrieve(sessionId);
		const ownerId = sessionUserId(session);
		if (ownerId !== userId) {
			onboardingTrace('stripe_reconcile', {
				userId,
				source: 'stripe',
				outcome: 'failed',
				reconcileSource: source,
				sessionId,
				reason: 'session_user_mismatch',
				ownerId
			});
			return false;
		}
		return reconcilePaidCheckoutSession(session, source);
	} catch (err) {
		onboardingTrace('stripe_reconcile', {
			userId,
			source: 'stripe',
			outcome: 'failed',
			reconcileSource: source,
			sessionId,
			error: err instanceof Error ? err.message : String(err)
		});
		return false;
	}
}

/**
 * Si le webhook n’a pas encore tourné (dev local, latence), cherche les sessions payées récentes.
 */
export async function syncRecentPaidCheckoutSessionsForUser(userId: string): Promise<boolean> {
	if (await getHasValidPaymentByUserId(userId)) {
		onboardingTrace('stripe_reconcile', {
			userId,
			source: 'stripe',
			outcome: 'skipped',
			reconcileSource: 'measurement_sync',
			reason: 'already_valid_in_db'
		});
		return true;
	}

	try {
		const listed = await stripe.checkout.sessions.list({
			client_reference_id: userId,
			limit: 10,
			status: 'complete'
		});

		onboardingTrace('stripe_reconcile', {
			userId,
			source: 'stripe',
			outcome: 'sync_list_start',
			reconcileSource: 'measurement_sync',
			sessionCount: listed.data.length,
			paidCount: listed.data.filter((s) => s.payment_status === 'paid').length
		});

		for (const summary of listed.data) {
			if (summary.payment_status !== 'paid') continue;
			const session = await stripe.checkout.sessions.retrieve(summary.id);
			await reconcilePaidCheckoutSession(session, 'measurement_sync');
			if (await getHasValidPaymentByUserId(userId)) {
				return true;
			}
		}
	} catch (err) {
		onboardingTrace('stripe_reconcile', {
			userId,
			source: 'stripe',
			outcome: 'failed',
			reconcileSource: 'measurement_sync',
			error: err instanceof Error ? err.message : String(err)
		});
	}

	const valid = await getHasValidPaymentByUserId(userId);
	onboardingTrace('stripe_reconcile', {
		userId,
		source: 'stripe',
		outcome: valid ? 'sync_list_ok' : 'sync_list_no_match',
		reconcileSource: 'measurement_sync',
		hasValidPayment: valid
	});
	return valid;
}
