import { prisma } from '$lib/server';

export type CreateOrUpdatePushSubscriptionData = {
	userId: string;
	endpoint: string;
	p256dh: string;
	auth: string;
};

export async function createOrUpdatePushSubscription(data: CreateOrUpdatePushSubscriptionData) {
	return prisma.pushSubscription.upsert({
		where: { userId_endpoint: { userId: data.userId, endpoint: data.endpoint } },
		create: data,
		update: { p256dh: data.p256dh, auth: data.auth }
	});
}
