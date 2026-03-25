import { prisma } from '$lib/server';

export async function getBadges() {
	const client = prisma as { badge?: { findMany: (args: unknown) => Promise<unknown[]> } };
	if (!client?.badge) return [];
	return client.badge.findMany({ orderBy: { slug: 'asc' } });
}
