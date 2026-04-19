import { prisma } from '$lib/server';

/**
 * Supprime un `ProgramDayItem` (détache donc la vidéo du jour).
 * Les `UserProgramDayItemCompletion` rattachés sont supprimés en cascade
 * grâce à `onDelete: Cascade` défini dans le schema.
 */
export async function detachProgramDayItem(programDayItemId: string): Promise<void> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const db = prisma as any;
	if (!db?.programDayItem) {
		throw new Error('Prisma client has no "programDayItem" model. Run: npx prisma generate');
	}
	await db.programDayItem.delete({ where: { id: programDayItemId } });
}
