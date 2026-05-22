import { prisma } from '$lib/server';
import { getHasValidPaymentByUserId } from '$lib/prisma/transaction/getHasValidPaymentByUserId';

export type OnboardingStep =
	| 'well_being_load'
	| 'well_being_save'
	| 'measurement_load'
	| 'measurement_save'
	| 'subscription_load'
	| 'subscription_checkout'
	| 'stripe_reconcile'
	| 'payment_check';

export type OnboardingSource = 'well-being' | 'measurement' | 'subscription' | 'stripe';

export type PaymentStatusSnapshot = {
	hasValidPayment: boolean;
	paidTransactionCount: number;
	latestTransactionStatus: string | null;
	latestOfferSlugs: string[];
	subscriptionEndsAt: string | null;
	subscriptionActive: boolean;
};

/** Jalon onboarding — une ligne JSON, visible en prod (grep `[onboarding]`). */
export function onboardingTrace(
	step: OnboardingStep,
	payload: Record<string, unknown> & { userId?: string; source?: OnboardingSource }
): void {
	console.log(
		'[onboarding]',
		JSON.stringify({
			ts: new Date().toISOString(),
			step,
			...payload
		})
	);
}

/** État paiement / abo pour le debug du parcours onboarding. */
export async function snapshotPaymentStatus(userId: string): Promise<PaymentStatusSnapshot> {
	const [hasValidPayment, transactions, user] = await Promise.all([
		getHasValidPaymentByUserId(userId),
		prisma.transaction.findMany({
			where: { userId },
			orderBy: { createdAt: 'desc' },
			take: 3,
			select: { status: true, offerSlugs: true, stripePaymentId: true, createdAt: true }
		}),
		prisma.user.findUnique({
			where: { id: userId },
			select: { subscriptionEndsAt: true }
		})
	]);

	const paidCount = transactions.filter((t) => t.status === 'paid').length;
	const latest = transactions[0] ?? null;
	const endsAt = user?.subscriptionEndsAt ?? null;
	const subscriptionActive = endsAt == null || endsAt > new Date();

	return {
		hasValidPayment,
		paidTransactionCount: paidCount,
		latestTransactionStatus: latest?.status ?? null,
		latestOfferSlugs: latest?.offerSlugs ?? [],
		subscriptionEndsAt: endsAt?.toISOString() ?? null,
		subscriptionActive
	};
}

export async function logPaymentStatus(
	userId: string,
	source: OnboardingSource,
	context: string
): Promise<PaymentStatusSnapshot> {
	const snapshot = await snapshotPaymentStatus(userId);
	onboardingTrace('payment_check', {
		userId,
		source,
		context,
		...snapshot,
		recentTransactions: (
			await prisma.transaction.findMany({
				where: { userId },
				orderBy: { createdAt: 'desc' },
				take: 3,
				select: { status: true, stripePaymentId: true, offerSlugs: true }
			})
		).map((t) => ({
			status: t.status,
			stripePaymentId: t.stripePaymentId,
			offerSlugs: t.offerSlugs
		}))
	});
	return snapshot;
}
