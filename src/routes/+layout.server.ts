import type { LayoutServerLoad } from './$types';
import { getCompanyProfile } from '$lib/server/company';

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		user: locals.user ?? null,
		company: await getCompanyProfile()
	};
};
