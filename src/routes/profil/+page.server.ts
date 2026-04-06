import type { PageServerLoad } from './$types';
import { checkAccess } from '$lib/server/access';

export const load: PageServerLoad = async ({ locals }) => {
	checkAccess(locals);
	return {
		user: locals.user,
		isAdmin: locals.user.role === 'ADMIN'
	};
};

// Toute form action doit également appeler checkAccess :
// export const actions = {
// 	default: async ({ locals }) => {
// 		checkAccess(locals);
// 		// ...
// 	}
// };
