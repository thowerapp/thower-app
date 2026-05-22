import { json } from '@sveltejs/kit';
import Stripe from 'stripe';
import { reconcilePaidCheckoutSession } from '$lib/server/stripe/reconcileCheckoutSession';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

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
			try {
				await reconcilePaidCheckoutSession(session, 'webhook');
			} catch (error) {
				console.error('Failed to reconcile checkout session', session.id, error);
			}
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
