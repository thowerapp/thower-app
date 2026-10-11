import { prisma } from '$lib/server';

/** Au-delà de ce délai, une génération restée RUNNING est considérée morte (fonction coupée) et peut être reprise. */
export const GENERATION_LEASE_MS = 10 * 60_000;

/**
 * Réserve la génération du programme de façon atomique : un seul appel concurrent obtient `true`.
 * Prisma/Mongo : `null` ne matche pas un champ absent, d'où `isSet: false` (comptes antérieurs au suivi).
 */
export async function claimProgramGeneration(userId: string, now = new Date()): Promise<boolean> {
	const expired = new Date(now.getTime() - GENERATION_LEASE_MS);
	const { count } = await prisma.user.updateMany({
		where: {
			id: userId,
			OR: [
				{ programGenStatus: null },
				{ programGenStatus: { isSet: false } },
				{ programGenStatus: { in: ['IDLE', 'DONE', 'FAILED'] } },
				{ programGenStatus: 'RUNNING', programGenStartedAt: { lt: expired } }
			]
		},
		data: { programGenStatus: 'RUNNING', programGenStartedAt: now, programGenFinishedAt: null }
	});
	return count === 1;
}

export async function finishProgramGeneration(
	userId: string,
	status: 'DONE' | 'FAILED'
): Promise<void> {
	await prisma.user.update({
		where: { id: userId },
		data: { programGenStatus: status, programGenFinishedAt: new Date() }
	});
}

/**
 * true si une génération attendue n'a pas abouti : échec, jamais démarrée, ou bail expiré.
 * Les comptes sans état (antérieurs au suivi) ne sont repris que s'ils n'ont aucun planning.
 */
export async function shouldResumeProgramGeneration(
	userId: string,
	now = new Date()
): Promise<boolean> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { programGenStatus: true, programGenStartedAt: true }
	});
	if (!user) return false;

	switch (user.programGenStatus) {
		case 'FAILED':
		case 'IDLE':
			return true;
		case 'RUNNING':
			return (
				user.programGenStartedAt == null ||
				now.getTime() - user.programGenStartedAt.getTime() >= GENERATION_LEASE_MS
			);
		case 'DONE':
			return false;
		default: {
			const anyDay = await prisma.nutritionDay.findFirst({
				where: { userId },
				select: { id: true }
			});
			return anyDay === null;
		}
	}
}
