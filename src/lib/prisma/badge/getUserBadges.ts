import { prisma } from '$lib/server';

export async function getUserBadges(userId: string) {
	return prisma.userBadge.findMany({
		where: { userId },
		include: { badge: true }
	});
}
