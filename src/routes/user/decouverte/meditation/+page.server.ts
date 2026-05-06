import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDiscoveryContentByCategoryProgressive } from '$lib/prisma/discoveryContent/getByCategoryProgressive';
import { getCompletedDiscoveryContentIds } from '$lib/prisma/userVideoProgress/getCompletedIds';
import { getCurrentDayIndex } from '$lib/prisma/program/getCurrentDayIndex';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/auth/login');
	const userId = locals.user.id;

	const currentDayIndex = await getCurrentDayIndex(userId);

	const [rawVideos, completedIds] = await Promise.all([
		getDiscoveryContentByCategoryProgressive('MEDITATION', currentDayIndex),
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
