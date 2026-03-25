import { prisma } from '$lib/server';

export async function completeDailyTask(userId: string, taskId: string, date: Date) {
	const client = prisma as {
		dailyTaskCompletion?: {
			upsert: (args: {
				where: { userId_taskId_date: { userId: string; taskId: string; date: Date } };
				create: unknown;
				update: unknown;
			}) => Promise<unknown>;
		};
	};
	if (!client?.dailyTaskCompletion) {
		throw new Error('Prisma client has no "dailyTaskCompletion" model. Run: npx prisma generate');
	}
	return client.dailyTaskCompletion.upsert({
		where: { userId_taskId_date: { userId, taskId, date } },
		create: { userId, taskId, date },
		update: {}
	});
}
