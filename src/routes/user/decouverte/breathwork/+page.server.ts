import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDiscoveryContentByCategory } from '$lib/prisma/discoveryContent/getByCategory';
import { getCompletedDiscoveryContentIds } from '$lib/prisma/userVideoProgress/getCompletedIds';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/auth/login');
	const userId = locals.user.id;

	const [rawVideos, completedIds] = await Promise.all([
		getDiscoveryContentByCategory('BREATHWORK'),
		getCompletedDiscoveryContentIds(userId)
	]);

	const completedSet = new Set(completedIds);

	const videos = (rawVideos as Array<{
		id: string;
		title: string;
		order: number;
		durationSeconds: number | null;
		thumbnailUrl: string | null;
		cloudflareUid: string;
		status: string;
	}>).map((v) => ({
		id: v.id,
		title: v.title,
		order: v.order,
		durationSeconds: v.durationSeconds,
		thumbnailUrl: v.thumbnailUrl,
		cloudflareUid: v.cloudflareUid,
		status: v.status,
		completed: completedSet.has(v.id)
	}));

	return { videos };
};
