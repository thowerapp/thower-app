import { prisma } from '$lib/server';

export async function getActiveTasks() {
	return prisma.dailyTask.findMany({
		where: { active: true },
		orderBy: { order: 'asc' }
	});
}
