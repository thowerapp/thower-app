import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDiscoveryContentByCategory } from '$lib/prisma/discoveryContent/getByCategory';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/auth/login');

	const [meditation, mindset, breathwork, motivation] = await Promise.all([
		getDiscoveryContentByCategory('MEDITATION'),
		getDiscoveryContentByCategory('MINDSET'),
		getDiscoveryContentByCategory('BREATHWORK'),
		getDiscoveryContentByCategory('MOTIVATION')
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
