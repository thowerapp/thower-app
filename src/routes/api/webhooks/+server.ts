import { json } from '@sveltejs/kit';
import Stripe from 'stripe';
import type { Prisma } from '@prisma/client';
import { prisma } from '$lib/server/index';
import { createTransactionFromStripeSession } from '$lib/prisma/transaction/createTransactionFromStripeSession';
import { getSubscriptionEndDateFromPlan, type PlanId } from '$lib/server/subscription-plans';
import { getBodyMeasurementsByUserId } from '$lib/prisma/bodyMeasurement/getBodyMeasurementsByUserId';
import { claimNutritionSegmentCreditOnTransaction } from '$lib/server/mongo/claimNutritionSegmentCredit';
import { incUserNutritionDaysAllocatedMongo } from '$lib/server/mongo/incUserNutritionDaysAllocated';
import { scheduleProgramGenerationAfterPayment } from '$lib/server/program-generation';
import { programGenTrace } from '$lib/server/program-generation/programGenerationLog';
import { NUTRITION_SEGMENT_DAYS } from '$lib/nutrition/nutritionPlanConstants';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

const VALID_PLANS: PlanId[] = ['quarterly'];

/** Secrets de signature (endpoint Dashboard, CLI `stripe listen`, preview Vercel…). */
function stripeWebhookSecrets(): string[] {
	const raw = [
		process.env.STRIPE_WEBHOOK_SECRET,
		process.env.STRIPE_WEBHOOK_SECRET_PREVIEW,
		process.env.STRIPE_WEBHOOK_SECRET_CLI
	]
		.filter(Boolean)
		.join(',');
	return [...new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))];
}

function constructStripeEvent(body: string, signature: string): Stripe.Event {
	const secrets = stripeWebhookSecrets();
	if (secrets.length === 0) {
		throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
	}
	let lastError: unknown;
	for (const secret of secrets) {
		try {
			return stripe.webhooks.constructEvent(body, signature, secret);
		} catch (err) {
			lastError = err;
		}
	}
	throw lastError instanceof Error ? lastError : new Error('Webhook signature verification failed');
}

/** Ligne User minimale pour le repli webhook (assertions : certains caches TS servent un User Prisma sans ce champ). */
type UserNutritionAllocatedRow = { nutritionDaysAllocated: number };

const selectNutritionDaysAllocated = {
	nutritionDaysAllocated: true
} as unknown as Prisma.UserSelect;

export async function POST({ request }: { request: Request }) {
	const sig = request.headers.get('stripe-signature');
	if (!sig) {
		console.error('[webhook] Missing stripe-signature header');
		return json({ error: 'Missing stripe-signature header' }, { status: 400 });
	}

	const body = await request.text();

	let event: Stripe.Event;

	try {
		event = constructStripeEvent(body, sig);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		const secretCount = stripeWebhookSecrets().length;
		console.error(
			'[webhook] Signature verification failed.',
			message,
			`| secrets configured: ${secretCount}`,
			`| body length: ${body.length}`
		);
		return json({ error: 'Webhook signature verification failed.' }, { status: 400 });
	}

	switch (event.type) {
		case 'checkout.session.completed': {
			const session = event.data.object as Stripe.Checkout.Session;
			await handleCheckoutSession(session);
			break;
		}

		case 'payment_intent.succeeded':
		case 'charge.succeeded':
			break;

		default:
			console.warn(`Unhandled event type: ${event.type}`);
	}

	return json({ received: true }, { status: 200 });
}

async function handleCheckoutSession(session: Stripe.Checkout.Session) {
	const checkoutUserId =
		session.metadata?.userId ?? session.client_reference_id ?? undefined;
	programGenTrace('trigger', {
		source: 'webhook',
		action: 'checkout.session.completed',
		sessionId: session.id,
		paymentStatus: session.payment_status,
		...(checkoutUserId ? { userId: checkoutUserId } : {})
	});

	try {
		let transaction = await prisma.transaction.findUnique({
			where: { stripePaymentId: session.id }
		});

		if (!transaction) {
			transaction = await createTransactionFromStripeSession(session);
			console.log('Transaction created for session:', session.id);
		} else {
			console.log('Transaction already recorded for session:', session.id);
		}

		// Paiement validé : crédit abonnement + jours nutrition (une seule fois par session Stripe).
		// Stripe peut envoyer checkout.session.completed plusieurs fois ; la 2e arrivait parfois
		// après la création Transaction mais avant user.update → génération avec nutritionDaysAllocated=0.
		if (session.payment_status !== 'paid' || !transaction.userId) {
			console.log(
				'[webhook] skip generation: session non payée ou userId manquant',
				session.id,
				session.payment_status,
				transaction.userId
			);
			return;
		}

		const planId = (session.metadata?.plan as PlanId | undefined) ?? 'quarterly';
		const user = await prisma.user.findUnique({
			where: { id: transaction.userId },
			select: { subscriptionEndsAt: true }
		});
		const currentEndsAt = user?.subscriptionEndsAt ?? null;
		const endsAt =
			VALID_PLANS.includes(planId)
				? getSubscriptionEndDateFromPlan(planId, currentEndsAt)
				: getSubscriptionEndDateFromPlan('quarterly', currentEndsAt);

		const credited = await claimNutritionSegmentCreditOnTransaction(transaction.id);

		if (credited) {
			await prisma.user.update({
				where: { id: transaction.userId },
				data: { subscriptionEndsAt: endsAt }
			});
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
				console.warn(
					'[webhook] $inc Mongo n’a touché aucun User — repli Prisma set explicite nutritionDaysAllocated'
				);
			}
			const after = (await prisma.user.findUnique({
				where: { id: transaction.userId },
				select: selectNutritionDaysAllocated
			})) as UserNutritionAllocatedRow | null;
			console.log(
				'User subscriptionEndsAt updated for',
				transaction.userId,
				'plan',
				planId,
				'until',
				endsAt.toISOString(),
				'| nutritionDaysAllocated=',
				after?.nutritionDaysAllocated ?? '?'
			);
			const measurements = await getBodyMeasurementsByUserId(transaction.userId, 1);
			if (measurements.length > 0) {
				programGenTrace('trigger', {
					userId: transaction.userId,
					source: 'webhook',
					action: 'schedule_generation_after_credit',
					measurementCount: measurements.length
				});
				void scheduleProgramGenerationAfterPayment(transaction.userId, {
					source: 'webhook'
				}).catch((err) => {
					console.error('[webhook] scheduleProgramGenerationAfterPayment failed', transaction.userId, err);
				});
			} else {
				programGenTrace('schedule_denied', {
					userId: transaction.userId,
					source: 'webhook',
					reason: 'no_measurements_yet',
					hint: 'complete /auth/measurement after payment'
				});
			}
		} else {
			console.log(
				'Checkout session already credited (nutrition segment) — skip user update + skip program generation:',
				session.id
			);
		}
	} catch (error) {
		console.error('Failed to create transaction for session', session.id, error);
	}
}
