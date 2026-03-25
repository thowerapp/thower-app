import { prisma } from '$lib/server';

export async function getPopupsForDay(programId: string, dayIndex: number) {
	const client = prisma as {
		dayPopup?: {
			findMany: (args: {
				where: { programId: string; dayIndex: number };
				orderBy: { order: 'asc' };
			}) => Promise<unknown[]>;
		};
	};
	if (!client?.dayPopup) return [];
	return client.dayPopup.findMany({
		where: { programId, dayIndex },
		orderBy: { order: 'asc' }
	});
}
