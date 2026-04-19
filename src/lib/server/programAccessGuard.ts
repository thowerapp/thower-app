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
