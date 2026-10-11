import { prisma } from '$lib/server';

export async function completeDailyTask(userId: string, taskId: string, date: Date) {
	return prisma.dailyTaskCompletion.upsert({
		where: { userId_taskId_date: { userId, taskId, date } },
		create: { userId, taskId, date },
		update: {}
	});
}
