import { prisma } from '$lib/server';

export async function deletePushSubscriptionByEndpoint(userId: string, endpoint: string) {
	const client = prisma as {
		pushSubscription?: {
			deleteMany: (args: { where: { userId: string; endpoint: string } }) => Promise<unknown>;
		};
	};
	if (!client?.pushSubscription) return;
	await client.pushSubscription.deleteMany({
		where: { userId, endpoint }
	});
}
