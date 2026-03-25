import { prisma } from '$lib/server';

export async function markVideoWatched(userId: string, videoId: string) {
	const client = prisma as {
		userVideoWatch?: {
			upsert: (args: {
				where: { userId_videoId: { userId: string; videoId: string } };
				create: unknown;
				update: unknown;
			}) => Promise<unknown>;
		};
	};
	if (!client?.userVideoWatch) {
		throw new Error('Prisma client has no "userVideoWatch" model. Run: npx prisma generate');
	}
	return client.userVideoWatch.upsert({
		where: { userId_videoId: { userId, videoId } },
		create: { userId, videoId },
		update: {}
	});
}
