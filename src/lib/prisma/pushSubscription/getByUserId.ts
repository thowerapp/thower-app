import { prisma } from '$lib/server';

export async function getPushSubscriptionsByUserId(userId: string) {
	const client = prisma as {
		pushSubscription?: {
			findMany: (args: { where: { userId: string } }) => Promise<unknown[]>;
		};
	};
	if (!client?.pushSubscription) return [];
	return client.pushSubscription.findMany({
		where: { userId }
	});
}
