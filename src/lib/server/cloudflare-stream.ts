import { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_API_TOKEN } from '$env/static/private';

const BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream`;

export async function createDirectUploadUrl(options?: {
	maxDurationSeconds?: number;
	requireSignedURLs?: boolean;
}): Promise<{ uploadURL: string; uid: string }> {
	const res = await fetch(`${BASE_URL}/direct_upload`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			maxDurationSeconds: options?.maxDurationSeconds ?? 300,
			requireSignedURLs: options?.requireSignedURLs ?? false
		})
	});

	if (!res.ok) {
		const err = await res.text();
		throw new Error(`Cloudflare Stream error ${res.status}: ${err}`);
	}

	const data = await res.json();
	return {
		uploadURL: data.result.uploadURL,
		uid: data.result.uid
	};
}

export function getStreamEmbedUrl(uid: string): string {
	return `https://iframe.cloudflarestream.com/${uid}`;
}
