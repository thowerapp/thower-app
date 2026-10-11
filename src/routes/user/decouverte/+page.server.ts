import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDiscoveryContentByCategoryProgressive } from '$lib/prisma/discoveryContent/getByCategoryProgressive';
import { getCurrentDayIndex } from '$lib/prisma/program/getCurrentDayIndex';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/auth/login');
	const userId = locals.user.id;

	try {
		const currentDayIndex = await getCurrentDayIndex(userId);

		const [bonus, motivation, explication] = await Promise.all([
			getDiscoveryContentByCategoryProgressive('BONUS', currentDayIndex),
			getDiscoveryContentByCategoryProgressive('MOTIVATION', currentDayIndex),
			getDiscoveryContentByCategoryProgressive('EXPLICATION', currentDayIndex)
		]);

		return {
			counts: {
				bonus:       { total: bonus.length       },
				motivation:  { total: motivation.length  },
				explication: { total: explication.length }
			}
		};
	} catch {
		return {
			counts: {
				bonus:       { total: 0 },
				motivation:  { total: 0 },
				explication: { total: 0 }
			}
		};
	}
};
