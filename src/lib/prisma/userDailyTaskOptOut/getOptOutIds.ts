import { prisma } from '$lib/server';

export async function getDailyTaskOptOutIds(userId: string): Promise<string[]> {
	const client = prisma as {
		userDailyTaskOptOut?: {
			findMany: (args: { where: { userId: string }; select: { taskId: true } }) => Promise<{ taskId: string }[]>;
		};
	};
	if (!client?.userDailyTaskOptOut) return [];
	const rows = await client.userDailyTaskOptOut.findMany({
		where: { userId },
		select: { taskId: true }
	});
	return rows.map((r) => r.taskId);
}
