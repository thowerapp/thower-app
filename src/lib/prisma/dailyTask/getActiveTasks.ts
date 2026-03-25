import { prisma } from '$lib/server';

export async function getActiveTasks() {
	const client = prisma as {
		dailyTask?: {
			findMany: (args: { where: { active: true }; orderBy: { order: 'asc' } }) => Promise<unknown[]>;
		};
	};
	if (!client?.dailyTask) return [];
	return client.dailyTask.findMany({
		where: { active: true },
		orderBy: { order: 'asc' }
	});
}
