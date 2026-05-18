import { prisma } from '$lib/server';
import { NUTRITION_SEGMENT_DAYS } from '$lib/nutrition/nutritionPlanConstants';
import { getHasValidPaymentByUserId } from '$lib/prisma/transaction/getHasValidPaymentByUserId';
import { generateProgramForUser } from './generateProgramForUser';
import {
	programGenError,
	programGenLog,
	programGenTrace,
	programGenWarn,
	type ProgramGenSource
} from './programGenerationLog';
import { logProgramGenSummary } from './logProgramGenSummary';

export type { ProgramGenSource } from './programGenerationLog';

export { PROGRAM_NUTRITION_DAYS, generateNutritionDaysForUser, generateNutrition91Days } from './nutrition/generateNutrition91Days';
export { generateProgramForUser } from './generateProgramForUser';

/** Admin / tests : crédite 91 j de nutrition si absent (pas de webhook Stripe). */
async function ensureNutritionDaysAllocated(userId: string): Promise<void> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { nutritionDaysAllocated: true }
	});
	if ((user?.nutritionDaysAllocated ?? 0) >= NUTRITION_SEGMENT_DAYS) return;

	await prisma.user.update({
		where: { id: userId },
		data: { nutritionDaysAllocated: NUTRITION_SEGMENT_DAYS }
	});
	programGenLog('1b/ nutritionDaysAllocated fixé à 91 (admin ou rattrapage)', { userId });
}

/**
 * Déclenché côté serveur après validation du formulaire measurement.
 * Paiement valide requis (sauf ADMIN). Le webhook Stripe ne génère plus le programme.
 */
export async function scheduleProgramGenerationAfterPayment(
	userId: string,
	options?: { role?: string; source?: ProgramGenSource }
): Promise<void> {
	const source = options?.source ?? 'internal';

	programGenTrace('schedule_start', { userId, source, role: options?.role });
	programGenLog('1/ entrée scheduleProgramGenerationAfterPayment', { userId, role: options?.role, source });

	const role =
		options?.role ??
		(
			await prisma.user.findUnique({
				where: { id: userId },
				select: { role: true }
			})
		)?.role;

	const isAdmin = role === 'ADMIN';

	if (isAdmin) {
		await ensureNutritionDaysAllocated(userId);
	}

	const hasValidPayment = await getHasValidPaymentByUserId(userId);
	const allowed = isAdmin || hasValidPayment;

	const userAlloc = await prisma.user.findUnique({
		where: { id: userId },
		select: { nutritionDaysAllocated: true }
	});

	programGenLog('1a/ contrôles schedule', {
		userId,
		isAdmin,
		hasValidPayment,
		allowed,
		nutritionDaysAllocated: userAlloc?.nutritionDaysAllocated ?? 0
	});

	if (!allowed) {
		programGenTrace('schedule_denied', {
			userId,
			source,
			isAdmin,
			hasValidPayment,
			reason: 'no_paid_transaction_or_expired_subscription'
		});
		programGenWarn(
			'Génération refusée : pas de transaction payée / abonnement expiré (compléter le paiement puis /auth/measurement)',
			{ userId }
		);
		return;
	}

	programGenTrace('schedule_ok', {
		userId,
		source,
		isAdmin,
		hasValidPayment,
		nutritionDaysAllocated: userAlloc?.nutritionDaysAllocated ?? 0
	});

	try {
		await generateProgramForUser(userId, source);
		programGenTrace('schedule_complete', { userId, source, outcome: 'ok' });
	} catch (err) {
		programGenError('generate_error', {
			userId,
			source,
			phase: 'generateProgramForUser',
			error: err instanceof Error ? err.message : String(err)
		});
		throw err;
	}
}
