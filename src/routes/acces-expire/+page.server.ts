import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/auth/login');

	const { role, subscriptionEndsAt } = locals.user;
	const hasAccess = role === 'ADMIN' || subscriptionEndsAt === null || subscriptionEndsAt > new Date();
	if (hasAccess) throw redirect(302, '/user');

	return { endedAt: subscriptionEndsAt?.toISOString() ?? null };
};
