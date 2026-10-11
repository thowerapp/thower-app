import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { loadDiscoveryVideo, markDiscoveryWatched } from '$lib/server/discovery/discoveryVideo';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) throw redirect(302, '/auth/login');
	const video = await loadDiscoveryVideo(locals.user.id, params.id, 'BREATHWORK');
	if (!video) throw redirect(302, '/user/decouverte/breathwork');
	return { video };
};

export const actions: Actions = {
	markWatched: async ({ locals, params }) => {
		if (!locals.user) return fail(401, {});
		try {
			const pointsEarned = await markDiscoveryWatched(locals.user.id, params.id, 'breathwork');
			return { success: true, pointsEarned };
		} catch {
			return fail(500, { message: 'Erreur serveur' });
		}
	}
};
