import { prisma } from '$lib/server';
import type { DiscoveryCategory } from '@prisma/client';

export async function getDiscoveryContentByCategory(category: DiscoveryCategory) {
	const client = prisma as {
		discoveryContent?: {
			findMany: (args: {
				where: { category: DiscoveryCategory; active: true };
				orderBy: { order: 'asc' };
			}) => Promise<unknown[]>;
		};
	};
	if (!client?.discoveryContent) return [];
	return client.discoveryContent.findMany({
		where: { category, active: true },
		orderBy: { order: 'asc' }
	});
}
