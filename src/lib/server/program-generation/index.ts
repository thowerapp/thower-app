import { generateProgramForUser } from './generateProgramForUser';
import { programGenLog } from './programGenerationLog';

export { PROGRAM_NUTRITION_DAYS, generateNutritionDaysForUser, generateNutrition91Days } from './nutrition/generateNutrition91Days';
export { generateProgramForUser } from './generateProgramForUser';

/**
 * Appel après paiement validé (webhook Stripe).
 * Retourne une promesse : à lancer avec void + .catch dans le handler pour ne pas bloquer la réponse HTTP.
 */
export function scheduleProgramGenerationAfterPayment(userId: string): Promise<void> {
	programGenLog('1/ entrée scheduleProgramGenerationAfterPayment (ex. webhook Stripe)', { userId });
	return generateProgramForUser(userId);
}
