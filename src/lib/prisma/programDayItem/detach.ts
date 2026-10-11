import { prisma } from '$lib/server';
import { invalidateSportPlan } from '$lib/server/sport/sportPlanCache';

/**
 * Supprime un `ProgramDayItem` (détache donc la vidéo du jour).
 * Les `UserProgramDayItemCompletion` rattachés sont supprimés en cascade
 * grâce à `onDelete: Cascade` défini dans le schema.
 */
export async function detachProgramDayItem(programDayItemId: string): Promise<void> {
	await prisma.programDayItem.delete({ where: { id: programDayItemId } });
	invalidateSportPlan();
}
