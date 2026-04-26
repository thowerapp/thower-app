import { error, json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { createDirectUploadUrl } from '$lib/server/cloudflare-stream';
import type { RequestHandler } from './$types';

/**
 * Démonstration / dev uniquement. En production, utiliser
 * `POST /api/admin/cloudflare-stream/upload-url` (session admin requise).
 */
export const POST: RequestHandler = async () => {
	if (!dev) {
		throw error(404, 'Not found');
	}
	const { uploadURL, uid } = await createDirectUploadUrl({ maxDurationSeconds: 300 });
	return json({ uploadURL, uid });
};
