import { redirect } from '@sveltejs/kit';
import { getProgramOfferEntitlements } from '$lib/prisma';

/**
 * À appeler depuis les **actions** formulaire : le layout ne s’exécute pas avant un POST.
 */
export async function requireNutritionAccess(userId: string, role: string): Promise<void> {
	if (role === 'ADMIN') return;
	const ent = await getProgramOfferEntitlements(userId);
	if (!ent.nutrition) throw redirect(302, '/auth/subscription?besoin=nutrition');
}

export async function requireSportAccess(userId: string, role: string): Promise<void> {
	if (role === 'ADMIN') return;
	const ent = await getProgramOfferEntitlements(userId);
	if (!ent.sport) throw redirect(302, '/auth/subscription?besoin=sport');
}

/** Variante pour les API (réponse 403 plutôt qu'une redirection) : l'offre sport est-elle achetée ? */
export async function hasSportAccess(userId: string, role: string): Promise<boolean> {
	if (role === 'ADMIN') return true;
	return (await getProgramOfferEntitlements(userId)).sport;
}
