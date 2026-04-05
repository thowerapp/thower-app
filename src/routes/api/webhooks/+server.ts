import { json } from '@sveltejs/kit';
import Stripe from 'stripe';
import { prisma } from '$lib/server/index';
import { createTransactionFromStripeSession } from '$lib/prisma/transaction/createTransactionFromStripeSession';
import { getSubscriptionEndDateFromPlan, type PlanId } from '$lib/server/subscription-plans';
import { scheduleProgramGenerationAfterPayment } from '$lib/server/program-generation';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

const VALID_PLANS: PlanId[] = ['monthly', 'annual'];

export async function POST({ request }: { request: Request }) {
	const sig = request.headers.get('stripe-signature');
	const body = await request.text();

	let event: Stripe.Event;

	try {
		event = stripe.webhooks.constructEvent(
			body,
			sig || '',
			process.env.STRIPE_WEBHOOK_SECRET || ''
		);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		console.error('Webhook signature verification failed.', message);
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
	try {
		const existing = await prisma.transaction.findUnique({
			where: { stripePaymentId: session.id }
		});
		if (existing) {
			console.log('Transaction already recorded for session:', session.id);
			if (session.payment_status === 'paid' && existing.userId) {
				void scheduleProgramGenerationAfterPayment(existing.userId).catch((err) => {
					console.error('scheduleProgramGenerationAfterPayment failed', existing.userId, err);
				});
			}
			return;
		}

		const transaction = await createTransactionFromStripeSession(session);
		console.log('Transaction created for session:', session.id);

		// Marquer l'accès accompagnement : durée selon la formule, et prolongation à partir de la date de fin actuelle si déjà abonné
		if (session.payment_status === 'paid' && transaction.userId) {
			const planId = (session.metadata?.plan as PlanId | undefined) ?? 'annual';
			const user = await prisma.user.findUnique({
				where: { id: transaction.userId },
				select: { subscriptionEndsAt: true }
			});
			const currentEndsAt = user?.subscriptionEndsAt ?? null;
			const endsAt =
				VALID_PLANS.includes(planId)
					? getSubscriptionEndDateFromPlan(planId, currentEndsAt)
					: getSubscriptionEndDateFromPlan('annual', currentEndsAt);
			await prisma.user.update({
				where: { id: transaction.userId },
				data: { subscriptionEndsAt: endsAt }
			});
			console.log('User subscriptionEndsAt updated for', transaction.userId, 'plan', planId, 'until', endsAt.toISOString());

			void scheduleProgramGenerationAfterPayment(transaction.userId).catch((err) => {
				console.error('scheduleProgramGenerationAfterPayment failed', transaction.userId, err);
			});
		}
	} catch (error) {
		console.error('Failed to create transaction for session', session.id, error);
	}
}
