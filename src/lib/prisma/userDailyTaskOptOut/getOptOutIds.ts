import { prisma } from '$lib/server';

export async function getDailyTaskOptOutIds(userId: string): Promise<string[]> {
	const rows = await prisma.userDailyTaskOptOut.findMany({ where: { userId }, select: { taskId: true } });
	return rows.map((r) => r.taskId);
}
