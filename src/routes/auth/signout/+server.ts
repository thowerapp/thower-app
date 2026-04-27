import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { invalidateSession } from '$lib/lucia/session';

async function signOut(cookies: Parameters<RequestHandler>[0]['cookies'], session: Parameters<RequestHandler>[0]['locals']['session']) {
	if (session) {
		await invalidateSession(session.id);
	}
	cookies.delete('session', { path: '/' });
	throw redirect(302, '/auth');
}

export const GET: RequestHandler = async ({ cookies, locals }) => {
	await signOut(cookies, locals.session);
};

export const POST: RequestHandler = async ({ cookies, locals }) => {
	await signOut(cookies, locals.session);
};
