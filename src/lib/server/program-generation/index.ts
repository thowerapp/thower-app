import { generateProgramForUser } from './generateProgramForUser';

export { PROGRAM_NUTRITION_DAYS } from './nutrition/generateNutrition91Days';
export { generateProgramForUser } from './generateProgramForUser';

/**
 * Appel après paiement validé (webhook Stripe).
 * Retourne une promesse : à lancer avec void + .catch dans le handler pour ne pas bloquer la réponse HTTP.
 */
export function scheduleProgramGenerationAfterPayment(userId: string): Promise<void> {
	return generateProgramForUser(userId);
}
