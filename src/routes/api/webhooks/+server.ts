import { json } from '@sveltejs/kit';
import Stripe from 'stripe';
import type { Prisma } from '@prisma/client';
import { prisma } from '$lib/server/index';
import { createTransactionFromStripeSession } from '$lib/prisma/transaction/createTransactionFromStripeSession';
import { getSubscriptionEndDateFromPlan, type PlanId } from '$lib/server/subscription-plans';
import { scheduleProgramGenerationAfterPayment } from '$lib/server/program-generation';
import { claimNutritionSegmentCreditOnTransaction } from '$lib/server/mongo/claimNutritionSegmentCredit';
import { incUserNutritionDaysAllocatedMongo } from '$lib/server/mongo/incUserNutritionDaysAllocated';
import { getBodyMeasurementsByUserId } from '$lib/prisma/bodyMeasurement/getBodyMeasurementsByUserId';
import { NUTRITION_SEGMENT_DAYS } from '$lib/nutrition/nutritionPlanConstants';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

const VALID_PLANS: PlanId[] = ['monthly', 'annual'];

/** Ligne User minimale pour le repli webhook (assertions : certains caches TS servent un User Prisma sans ce champ). */
type UserNutritionAllocatedRow = { nutritionDaysAllocated: number };

const selectNutritionDaysAllocated = {
	nutritionDaysAllocated: true
} as unknown as Prisma.UserSelect;

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

			// On ne génère le programme que lorsqu'un nouveau crédit a réellement été appliqué.
			// Cela évite les régénérations déclenchées par des webhooks dupliqués/non-opérants.
		// LE NOUVEAU FLUX : on génère seulement si les measurements (formulaire) existent déjà.
		// Sinon on attend que l'utilisateur remplisse le formulaire et déclenche la génération depuis là.
		const bodyMeasurements = await getBodyMeasurementsByUserId(transaction.userId, 1);
		if (bodyMeasurements.length > 0) {
			void scheduleProgramGenerationAfterPayment(transaction.userId).catch((err) => {
				console.error('scheduleProgramGenerationAfterPayment failed', transaction.userId, err);
			});
			console.log(
				'[webhook] Paiement validé avec profil complet → génération programme déclenchée pour',
				transaction.userId
			);
		} else {
			console.log(
				'[webhook] Paiement validé MAIS profil physique incomplet → attente formulaire pour user',
				transaction.userId
			);
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
