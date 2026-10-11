import { prisma } from '$lib/server';

export async function getPushSubscriptionsByUserId(userId: string) {
	return prisma.pushSubscription.findMany({ where: { userId } });
}
