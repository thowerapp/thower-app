import { prisma } from '$lib/server';

export async function deletePushSubscriptionByEndpoint(userId: string, endpoint: string) {
	await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
}
