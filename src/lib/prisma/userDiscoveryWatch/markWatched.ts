import { prisma } from '$lib/server';

export async function markDiscoveryWatched(userId: string, contentId: string) {
	const client = prisma as {
		userDiscoveryWatch?: {
			upsert: (args: {
				where: { userId_contentId: { userId: string; contentId: string } };
				create: unknown;
				update: unknown;
			}) => Promise<unknown>;
		};
	};
	if (!client?.userDiscoveryWatch) {
		throw new Error('Prisma client has no "userDiscoveryWatch" model. Run: npx prisma generate');
	}
	return client.userDiscoveryWatch.upsert({
		where: { userId_contentId: { userId, contentId } },
		create: { userId, contentId },
		update: {}
	});
}
