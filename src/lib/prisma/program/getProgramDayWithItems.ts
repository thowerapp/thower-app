import { prisma } from '$lib/server';

export async function getProgramDayWithItems(programId: string, dayIndex: number) {
	const client = prisma as {
		programDay?: {
			findUnique: (args: {
				where: { programId_dayIndex: { programId: string; dayIndex: number } };
				include: { items: true };
			}) => Promise<unknown>;
		};
	};
	if (!client?.programDay) return null;
	return client.programDay.findUnique({
		where: { programId_dayIndex: { programId, dayIndex } },
		include: { items: { orderBy: { order: 'asc' } } }
	});
}
