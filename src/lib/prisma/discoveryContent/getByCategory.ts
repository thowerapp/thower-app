import { prisma } from '$lib/server';
import type { DiscoveryCategory } from '@prisma/client';
import { notSeedVideo } from '$lib/prisma/video/seedVideo';

export async function getDiscoveryContentByCategory(category: DiscoveryCategory) {
	return prisma.discoveryContent.findMany({
		where: { category, active: true, ...notSeedVideo },
		orderBy: { order: 'asc' }
	});
}
