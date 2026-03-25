import { prisma } from '$lib/server';

export async function getUserBadges(userId: string) {
	const client = prisma as {
		userBadge?: {
			findMany: (args: {
				where: { userId: string };
				include: { badge: true };
			}) => Promise<unknown[]>;
		};
	};
	if (!client?.userBadge) return [];
	return client.userBadge.findMany({
		where: { userId },
		include: { badge: true }
	});
}
