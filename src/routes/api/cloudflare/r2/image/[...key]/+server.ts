import { getFromR2 } from '$lib/server/cloudflare-r2';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return new Response(null, { status: 401 });
	}

	const key = params.key; // ex: "photos/userId/uuid.jpg"
	const parts = key.split('/');

	// Vérification ownership : seul le propriétaire (ou ADMIN) peut accéder à sa photo
	if (parts[0] === 'photos') {
		const ownerUserId = parts[1];
		if (locals.user.id !== ownerUserId && locals.user.role !== 'ADMIN') {
			return new Response(null, { status: 403 });
		}
	}

	try {
		const r2Response = await getFromR2(key);
		const contentType = r2Response.headers.get('content-type') ?? 'application/octet-stream';
		const body = await r2Response.arrayBuffer();

		return new Response(body, {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'private, max-age=3600'
			}
		});
	} catch {
		return new Response(null, { status: 404 });
	}
};
