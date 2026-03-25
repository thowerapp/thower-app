import { getFromR2 } from '$lib/server/cloudflare-r2';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const key = decodeURIComponent(params.key);

	const r2Response = await getFromR2(key);

	const contentType = r2Response.headers.get('content-type') ?? 'application/octet-stream';
	const body = await r2Response.arrayBuffer();

	return new Response(body, {
		headers: {
			'Content-Type': contentType,
			'Cache-Control': 'private, max-age=3600'
		}
	});
};
