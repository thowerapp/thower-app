import { prisma } from '$lib/server';

export async function optOutOfDailyTask(userId: string, taskId: string) {
	const client = prisma as {
		userDailyTaskOptOut?: {
			create: (args: { data: { userId: string; taskId: string } }) => Promise<unknown>;
		};
	};
	if (!client?.userDailyTaskOptOut) {
		throw new Error('Prisma client has no "userDailyTaskOptOut" model. Run: npx prisma generate');
	}
	return client.userDailyTaskOptOut.create({
		data: { userId, taskId }
	});
}
