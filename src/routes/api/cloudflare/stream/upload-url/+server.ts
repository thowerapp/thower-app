import { json } from '@sveltejs/kit';
import { createDirectUploadUrl } from '$lib/server/cloudflare-stream';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
	const { uploadURL, uid } = await createDirectUploadUrl({ maxDurationSeconds: 300 });
	return json({ uploadURL, uid });
};
