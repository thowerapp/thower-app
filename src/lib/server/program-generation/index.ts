import { getHasValidPaymentByUserId } from '$lib/prisma/transaction/getHasValidPaymentByUserId';
import { generateProgramForUser } from './generateProgramForUser';
import { programGenLog } from './programGenerationLog';

export { PROGRAM_NUTRITION_DAYS, generateNutritionDaysForUser, generateNutrition91Days } from './nutrition/generateNutrition91Days';
export { generateProgramForUser } from './generateProgramForUser';

/**
 * Déclenché côté serveur après validation du formulaire measurement.
 * Vérifie les droits (transaction payée + abonnement actif) avant toute génération.
 */
export async function scheduleProgramGenerationAfterPayment(userId: string): Promise<void> {
	programGenLog('1/ entrée scheduleProgramGenerationAfterPayment', { userId });
	const allowed = await getHasValidPaymentByUserId(userId);
	if (!allowed) {
		console.warn(
			'[program-generation] Génération refusée : accès accompagnement invalide (pas de transaction payée ou abonnement expiré)',
			{ userId }
		);
		return;
	}
	await generateProgramForUser(userId);
}
