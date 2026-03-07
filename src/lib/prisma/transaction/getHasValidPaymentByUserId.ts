import { prisma } from '$lib/server';

/**
 * Retourne true si l'utilisateur a un accès accompagnement valide :
 * au moins une transaction payée ET (pas de date de fin OU date de fin dans le futur).
 */
export async function getHasValidPaymentByUserId(userId: string): Promise<boolean> {
	try {
		const paid = await prisma.transaction.findFirst({
			where: { userId, status: 'paid' }
		});
		if (!paid) return false;

		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { subscriptionEndsAt: true }
		});
		if (!user) return false;
		// Pas de date de fin = accès à vie (rétrocompat) ; sinon on vérifie la date
		if (user.subscriptionEndsAt == null) return true;
		return user.subscriptionEndsAt > new Date();
	} catch {
		return false;
	}
}
