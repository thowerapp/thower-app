import { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_API_TOKEN, R2_BUCKET_NAME } from '$env/static/private';

const BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${R2_BUCKET_NAME}/objects`;

export async function uploadToR2(key: string, body: ArrayBuffer, contentType: string): Promise<void> {
	const res = await fetch(`${BASE_URL}/${encodeURIComponent(key)}`, {
		method: 'PUT',
		headers: {
			Authorization: `Bearer ${CLOUDFLARE_R2_API_TOKEN}`,
			'Content-Type': contentType
		},
		body
	});

	if (!res.ok) {
		const err = await res.text();
		throw new Error(`R2 upload error ${res.status}: ${err}`);
	}
}

export async function getFromR2(key: string): Promise<Response> {
	const res = await fetch(`${BASE_URL}/${encodeURIComponent(key)}`, {
		headers: {
			Authorization: `Bearer ${CLOUDFLARE_R2_API_TOKEN}`
		}
	});

	if (!res.ok) {
		throw new Error(`R2 fetch error ${res.status}`);
	}

	return res;
}

export async function deleteFromR2(key: string): Promise<void> {
	const res = await fetch(`${BASE_URL}/${encodeURIComponent(key)}`, {
		method: 'DELETE',
		headers: {
			Authorization: `Bearer ${CLOUDFLARE_R2_API_TOKEN}`
		}
	});

	if (!res.ok) {
		const err = await res.text();
		throw new Error(`R2 delete error ${res.status}: ${err}`);
	}
}
