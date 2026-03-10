import type { RequestHandler } from './$types';
import { invalidateSession } from '$lib/lucia/session';

export const POST: RequestHandler = async ({ cookies, locals }) => {
	// Vérifier s'il y a une session active
	if (!locals.session) {
		return new Response(JSON.stringify({ message: 'Not authenticated' }), { status: 401 });
	}

	// Invalider la session côté serveur
	invalidateSession(locals.session.id);
	cookies.delete('session', { path: '/' });

	// Redirection après la déconnexion
	return new Response(JSON.stringify({ success: true }), { status: 200 });
};
