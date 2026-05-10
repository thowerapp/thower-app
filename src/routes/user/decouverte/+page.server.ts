import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDiscoveryContentByCategoryProgressive } from '$lib/prisma/discoveryContent/getByCategoryProgressive';
import { getCurrentDayIndex } from '$lib/prisma/program/getCurrentDayIndex';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/auth/login');
	const userId = locals.user.id;

	const currentDayIndex = await getCurrentDayIndex(userId);

	const [meditation, mindset, breathwork, motivation] = await Promise.all([
		getDiscoveryContentByCategoryProgressive('MEDITATION', currentDayIndex),
		getDiscoveryContentByCategoryProgressive('MINDSET', currentDayIndex),
		getDiscoveryContentByCategoryProgressive('BREATHWORK', currentDayIndex),
		getDiscoveryContentByCategoryProgressive('MOTIVATION', currentDayIndex)
	]);

	return {
		counts: {
			meditation: { total: meditation.length },
			mindset:    { total: mindset.length    },
			breathwork: { total: breathwork.length },
			motivation: { total: motivation.length }
		}
	};
};
