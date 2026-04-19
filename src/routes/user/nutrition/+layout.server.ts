import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

/** Protège toutes les routes sous `/user/nutrition/*` si l’offre nutrition n’est pas achetée. */
export const load: LayoutServerLoad = async ({ parent }) => {
	const { programAccess } = await parent();
	if (!programAccess?.nutrition) {
		throw redirect(302, '/auth/subscription?besoin=nutrition');
	}
	return {};
};
