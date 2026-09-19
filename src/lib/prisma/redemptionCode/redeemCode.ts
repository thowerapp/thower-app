import { prisma } from '$lib/server';

export type RedeemCodeResult =
	| { success: true }
	| { success: false; reason: 'invalid_or_used' };

function normalizeCode(raw: string): string {
	return raw.trim().toUpperCase();
}

/**
 * Consomme un code d'accès à usage unique : marque le code comme utilisé (guard
 * atomique sur usedByUserId=null pour éviter une double-utilisation en cas de
 * course), crée une Transaction synthétique `status: 'paid'` (source de vérité
 * déjà utilisée par getHasValidPaymentByUserId/getProgramOfferEntitlements) et
 * donne un accès à vie (subscriptionEndsAt = null).
 */
export async function redeemCode(rawCode: string, userId: string): Promise<RedeemCodeResult> {
	const code = normalizeCode(rawCode);
	if (!code) return { success: false, reason: 'invalid_or_used' };

	const { count } = await prisma.redemptionCode.updateMany({
		where: { code, usedByUserId: null },
		data: { usedByUserId: userId, usedAt: new Date() }
	});

	if (count === 0) {
		return { success: false, reason: 'invalid_or_used' };
	}

	await prisma.$transaction([
		prisma.transaction.create({
			data: {
				stripePaymentId: `redeem_${code}`,
				userId,
				amount: 0,
				currency: 'eur',
				status: 'paid',
				offerSlugs: ['nutrition', 'sport']
			}
		}),
		prisma.user.update({
			where: { id: userId },
			data: { subscriptionEndsAt: null }
		})
	]);

	return { success: true };
}
