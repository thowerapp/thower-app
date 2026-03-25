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
	offerSlugs?: string[];
};

export async function createTransactionFromStripeSession(session: Stripe.Checkout.Session) {
	const amount = session.amount_total != null ? session.amount_total / 100 : 0;
	const currency = session.currency ?? 'eur';
	const status = session.payment_status ?? 'unknown';
	const userId = session.metadata?.userId ?? session.client_reference_id ?? null;

	let offerSlugs: string[] = [];
	const raw = session.metadata?.offerSlugs ?? session.metadata?.programSlugs;
	if (typeof raw === 'string' && raw) {
		try {
			offerSlugs = JSON.parse(raw) as string[];
		} catch {
			offerSlugs = [];
		}
	}
	if (!Array.isArray(offerSlugs)) offerSlugs = [];

	const data: CreateTransactionData = {
		stripePaymentId: session.id,
		userId: userId || null,
		amount,
		currency,
		status,
		customer_details_email: session.customer_details?.email ?? '',
		customer_details_name: session.customer_details?.name ?? '',
		offerSlugs
	};

	return prisma.transaction.create({
		data: {
			stripePaymentId: data.stripePaymentId,
			userId: data.userId,
			amount: data.amount,
			currency: data.currency,
			status: data.status,
			customer_details_email: data.customer_details_email ?? '',
			customer_details_name: data.customer_details_name ?? '',
			offerSlugs: data.offerSlugs ?? []
		}
	});
}
