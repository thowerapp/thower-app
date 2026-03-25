import { prisma } from '$lib/server';

export async function getWatchedVideoIdsForUser(userId: string): Promise<string[]> {
	const client = prisma as {
		userVideoWatch?: {
			findMany: (args: { where: { userId: string }; select: { videoId: true } }) => Promise<{ videoId: string }[]>;
		};
	};
	if (!client?.userVideoWatch) return [];
	const rows = await client.userVideoWatch.findMany({
		where: { userId },
		select: { videoId: true }
	});
	return rows.map((r) => r.videoId);
}
