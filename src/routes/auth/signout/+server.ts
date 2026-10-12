import { redirect } from '@sveltejs/kit';
import type { RequestEvent, RequestHandler } from './$types';
import { deleteSessionTokenCookie, invalidateSession } from '$lib/lucia/session';

async function signOut(event: RequestEvent): Promise<never> {
	if (event.locals.session) {
		await invalidateSession(event.locals.session.id);
	}
	deleteSessionTokenCookie(event);
	throw redirect(302, '/auth/login');
}

export const GET: RequestHandler = (event) => signOut(event);

export const POST: RequestHandler = (event) => signOut(event);
