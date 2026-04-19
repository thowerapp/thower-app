import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

/** Protège toutes les routes sous `/user/sport/*` si l’offre sport n’est pas achetée. */
export const load: LayoutServerLoad = async ({ parent }) => {
	const { programAccess } = await parent();
	if (!programAccess?.sport) {
		throw redirect(302, '/auth/subscription?besoin=sport');
	}
	return {};
};
