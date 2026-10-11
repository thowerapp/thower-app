import { prisma } from '$lib/server';
import { programCycleSelect, resolveProgramCycle, type ProgramCycle } from '$lib/utils/programCycle';

/** Cycle de 91 jours en cours pour un utilisateur (voir `resolveProgramCycle`). */
export async function getUserProgramCycle(userId: string, now: Date = new Date()): Promise<ProgramCycle> {
	const user = await prisma.user.findUnique({ where: { id: userId }, select: programCycleSelect });
	return resolveProgramCycle(user, now);
}
