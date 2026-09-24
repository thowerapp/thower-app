import { prisma } from '$lib/server';
import type { DiscoveryCategory } from '@prisma/client';
import { notSeedVideo } from '$lib/prisma/video/seedVideo';

export async function getDiscoveryContentByCategory(category: DiscoveryCategory) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const db = prisma as any;
	if (!db?.discoveryContent) return [];
	return db.discoveryContent.findMany({
		where: { category, active: true, ...notSeedVideo },
		orderBy: { order: 'asc' }
	}) as Promise<unknown[]>;
}
