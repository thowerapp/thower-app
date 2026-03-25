import { prisma } from '$lib/server';

/** Retourne les complétions d'un user pour les items d'un jour donné (via programDayId). */
export async function getCompletionsForUserAndDay(userId: string, programDayId: string) {
	const client = prisma as {
		userProgramDayItemCompletion?: {
			findMany: (args: {
				where: { userId: string; item: { programDayId: string } };
				include?: { item: true };
			}) => Promise<unknown[]>;
		};
	};
	if (!client?.userProgramDayItemCompletion) return [];
	const rows = await client.userProgramDayItemCompletion.findMany({
		where: { userId, item: { programDayId } },
		include: { item: true }
	});
	return rows;
}
