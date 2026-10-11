import { prisma } from '$lib/server';

/** Retourne les complétions d'un user pour les items d'un jour donné (via programDayId). */
export async function getCompletionsForUserAndDay(userId: string, programDayId: string) {
	return prisma.userProgramDayItemCompletion.findMany({
		where: { userId, item: { programDayId } },
		include: { item: true }
	});
}
