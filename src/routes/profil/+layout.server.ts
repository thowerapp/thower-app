import { checkAccess } from '$lib/server/access';

export const load = async ({ locals }: { locals: App.Locals }) => {
	checkAccess(locals);
	return { user: locals.user };
};
