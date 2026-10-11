import { prisma } from '$lib/server';

export async function getPopupsForDay(programId: string, dayIndex: number) {
	return prisma.dayPopup.findMany({
		where: { programId, dayIndex },
		orderBy: { order: 'asc' }
	});
}
