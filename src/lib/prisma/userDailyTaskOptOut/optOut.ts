import { prisma } from '$lib/server';

export async function optOutOfDailyTask(userId: string, taskId: string) {
	return prisma.userDailyTaskOptOut.create({ data: { userId, taskId } });
}
