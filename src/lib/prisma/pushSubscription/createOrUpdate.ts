import { prisma } from '$lib/server';

export type CreateOrUpdatePushSubscriptionData = {
	userId: string;
	endpoint: string;
	p256dh: string;
	auth: string;
};

export async function createOrUpdatePushSubscription(data: CreateOrUpdatePushSubscriptionData) {
	const client = prisma as {
		pushSubscription?: {
			upsert: (args: {
				where: { userId_endpoint: { userId: string; endpoint: string } };
				create: unknown;
				update: unknown;
			}) => Promise<unknown>;
		};
	};
	if (!client?.pushSubscription) {
		throw new Error('Prisma client has no "pushSubscription" model. Run: npx prisma generate');
	}
	return client.pushSubscription.upsert({
		where: { userId_endpoint: { userId: data.userId, endpoint: data.endpoint } },
		create: data,
		update: { p256dh: data.p256dh, auth: data.auth }
	});
}
