import { prisma } from '$lib/server';
import type Stripe from 'stripe';

export type CreateTransactionData = {
	stripePaymentId: string;
	userId: string | null;
	amount: number;
	currency: string;
	status: string;
	customer_details_email?: string | null;
	customer_details_name?: string | null;
};

export async function createTransactionFromStripeSession(session: Stripe.Checkout.Session) {
	const amount = session.amount_total != null ? session.amount_total / 100 : 0;
	const currency = session.currency ?? 'eur';
	const status = session.payment_status ?? 'unknown';
	const userId = session.metadata?.userId ?? session.client_reference_id ?? null;

	const data: CreateTransactionData = {
		stripePaymentId: session.id,
		userId: userId || null,
		amount,
		currency,
		status,
		customer_details_email: session.customer_details?.email ?? '',
		customer_details_name: session.customer_details?.name ?? ''
	};

	return prisma.transaction.create({
		data: {
			stripePaymentId: data.stripePaymentId,
			userId: data.userId,
			amount: data.amount,
			currency: data.currency,
			status: data.status,
			customer_details_email: data.customer_details_email ?? '',
			customer_details_name: data.customer_details_name ?? ''
		}
	});
}
