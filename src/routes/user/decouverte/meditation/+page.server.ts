import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAllDiscoveryWithLockState } from '$lib/prisma/discoveryContent/getAllWithLockState';
import { getCompletedDiscoveryContentIds } from '$lib/prisma/userVideoProgress/getCompletedIds';
import { getCurrentDayIndex } from '$lib/prisma/program/getCurrentDayIndex';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/auth/login');
	const userId = locals.user.id;

	const currentDayIndex = await getCurrentDayIndex(userId);
	const completedIds = await getCompletedDiscoveryContentIds(userId);
	const videos = await getAllDiscoveryWithLockState('MEDITATION', currentDayIndex, new Set(completedIds));

	return { videos };
};
