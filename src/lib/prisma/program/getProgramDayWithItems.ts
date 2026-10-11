import { prisma } from '$lib/server';

export async function getProgramDayWithItems(programId: string, dayIndex: number) {
	return prisma.programDay.findUnique({
		where: { programId_dayIndex: { programId, dayIndex } },
		include: { items: { orderBy: { order: 'asc' } } }
	});
}
