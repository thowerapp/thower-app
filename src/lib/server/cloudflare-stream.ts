import { env } from '$env/dynamic/private';
import { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_API_TOKEN } from '$env/static/private';

function getStreamBaseUrl(): string {
	const id = (CLOUDFLARE_ACCOUNT_ID ?? '').trim();
	const token = (CLOUDFLARE_STREAM_API_TOKEN ?? '').trim();
	if (!id || !token) {
		throw new Error(
			'Configuration Stream incomplète : définis CLOUDFLARE_ACCOUNT_ID et CLOUDFLARE_STREAM_API_TOKEN dans .env, puis redémarre le serveur (Vite ne recharge pas les secrets à chaud).'
		);
	}
	return `https://api.cloudflare.com/client/v4/accounts/${id}/stream`;
}

function streamAuthHeaders() {
	return {
		Authorization: `Bearer ${(CLOUDFLARE_STREAM_API_TOKEN ?? '').trim()}`,
		'Content-Type': 'application/json'
	} as const;
}

/* ─── 1. Upload direct (tus) ────────────────────────────────────────────── */

/** Erreur API Stream avec code HTTP Cloudflare (413 quota, 401 token, etc.). */
export class CloudflareStreamRequestError extends Error {
	readonly httpStatus: number;
	constructor(message: string, httpStatus: number) {
		super(message);
		this.name = 'CloudflareStreamRequestError';
		this.httpStatus = httpStatus;
	}
}

export type CreateDirectUploadOptions = {
	maxDurationSeconds?: number;
	requireSignedURLs?: boolean;
	meta?: Record<string, string>;
};

function clampDirectUploadMaxSeconds(n: number | undefined): number {
	const fallback = 7200;
	if (n == null || !Number.isFinite(n) || n <= 0) return fallback;
	return Math.max(60, Math.min(21600, n));
}

/** Extrait le message d’une réponse d’API Cloudflare v4. */
function formatCloudflareApiFailure(status: number, bodyText: string): string {
	try {
		const j = JSON.parse(bodyText) as { errors?: Array<{ message?: string; code?: number }> };
		const first = j.errors?.[0];
		if (first?.message) {
			let text = `Cloudflare (${status}) : ${first.message}${first.code != null ? ` [code ${first.code}]` : ''}`;
			if (first.code === 10011 || status === 413) {
				text +=
					'\n\nQuota Stream dépassé (minutes ou stockage réservé). Supprime des vidéos dans le dashboard Cloudflare → Stream, ou augmente ton forfait / achète des minutes.';
			}
			return text;
		}
	} catch {
		// ignore
	}
	return `Cloudflare Stream direct_upload a répondu ${status} : ${bodyText || '(corps vide)'}`;
}

/**
 * Crée une URL d'upload directe (tus). Le navigateur uploade le fichier en
 * direct vers Cloudflare via cette URL — aucun byte ne transite par notre serveur.
 * `requireSignedURLs:true` impose un token signé pour lire la vidéo ensuite.
 */
export async function createDirectUploadUrl(
	options: CreateDirectUploadOptions = {}
): Promise<{ uploadURL: string; uid: string }> {
	const base = getStreamBaseUrl();
	const maxDurationSeconds = clampDirectUploadMaxSeconds(options.maxDurationSeconds);
	const requireSignedBool = options.requireSignedURLs ?? true;
	const meta: Record<string, string> = {};
	if (options.meta) {
		for (const [k, v] of Object.entries(options.meta)) {
			meta[k] = String(v);
		}
	}

	const res = await fetch(`${base}/direct_upload`, {
		method: 'POST',
		headers: streamAuthHeaders(),
		body: JSON.stringify({
			maxDurationSeconds,
			requireSignedURLs: requireSignedBool,
			...(Object.keys(meta).length > 0 ? { meta } : {})
		})
	});

	const bodyText = await res.text();

	if (!res.ok) {
		throw new CloudflareStreamRequestError(
			formatCloudflareApiFailure(res.status, bodyText),
			res.status
		);
	}

	let data: { success?: boolean; result?: { uploadURL?: string; uid?: string }; errors?: unknown };
	try {
		data = JSON.parse(bodyText) as typeof data;
	} catch {
		throw new CloudflareStreamRequestError(
			`Réponse direct_upload inattendue (JSON invalide) : ${bodyText.slice(0, 200)}`,
			502
		);
	}

	if (data.success === false || !data.result?.uploadURL || !data.result?.uid) {
		throw new CloudflareStreamRequestError(
			formatCloudflareApiFailure(res.status, bodyText),
			502
		);
	}

	return {
		uploadURL: data.result.uploadURL,
		uid: data.result.uid
	};
}

/* ─── 2. Détails vidéo ──────────────────────────────────────────────────── */

export type StreamVideoDetails = {
	uid: string;
	status: 'pendingupload' | 'queued' | 'inprogress' | 'ready' | 'error';
	duration: number | null;
	thumbnail: string | null;
	readyToStream: boolean;
};

/** Récupère les métadonnées d'une vidéo Cloudflare (durée, statut, vignette). */
export async function getVideoDetails(uid: string): Promise<StreamVideoDetails | null> {
	const res = await fetch(`${getStreamBaseUrl()}/${uid}`, {
		headers: { Authorization: streamAuthHeaders().Authorization }
	});
	if (res.status === 404) return null;
	if (!res.ok) {
		const err = await res.text();
		throw new Error(`Cloudflare Stream get error ${res.status}: ${err}`);
	}
	const data = await res.json();
	const r = data.result;
	return {
		uid: r.uid,
		status: r.status?.state ?? 'pendingupload',
		duration: typeof r.duration === 'number' && r.duration > 0 ? r.duration : null,
		thumbnail: r.thumbnail ?? null,
		readyToStream: !!r.readyToStream
	};
}

/* ─── 3. Suppression vidéo ──────────────────────────────────────────────── */

/** Supprime la vidéo côté Cloudflare. Idempotent (404 ignoré). */
export async function deleteStreamVideo(uid: string): Promise<void> {
	const res = await fetch(`${getStreamBaseUrl()}/${uid}`, {
		method: 'DELETE',
		headers: { Authorization: streamAuthHeaders().Authorization }
	});
	if (res.ok || res.status === 404) return;
	const err = await res.text();
	throw new Error(`Cloudflare Stream delete error ${res.status}: ${err}`);
}

/* ─── 4. Token de lecture signé (par utilisateur) ───────────────────────── */

export type SignedTokenOptions = {
	/** Durée de validité en secondes (défaut 2 h, max 24 h côté Cloudflare). */
	expiresInSeconds?: number;
	/** Identifiant utilisateur — propagé dans les analytics Stream pour traçabilité. */
	userId?: string;
};

/**
 * Demande à Cloudflare un token signé pour lire une vidéo `requireSignedURLs:true`.
 * Le token retourné remplace l'UID dans l'URL d'embed et expire automatiquement.
 * Plus simple que signer un JWT localement (pas besoin de gérer la clé privée).
 *
 * Doc : https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/
 */
export async function createSignedPlaybackToken(
	uid: string,
	options: SignedTokenOptions = {}
): Promise<string> {
	const expSeconds = options.expiresInSeconds ?? 7200;
	const exp = Math.floor(Date.now() / 1000) + expSeconds;

	const body: Record<string, unknown> = { exp };
	if (options.userId) {
		body.downloadable = false;
	}

	const res = await fetch(`${getStreamBaseUrl()}/${uid}/token`, {
		method: 'POST',
		headers: streamAuthHeaders(),
		body: JSON.stringify(body)
	});
	if (!res.ok) {
		const err = await res.text();
		throw new Error(`Cloudflare Stream token error ${res.status}: ${err}`);
	}
	const data = await res.json();
	return data.result.token as string;
}

/* ─── 5. URL d'embed ────────────────────────────────────────────────────── */

/**
 * URL d'embed iframe — `tokenOrUid` est soit un UID public, soit un token
 * signé renvoyé par `createSignedPlaybackToken`. Cloudflare gère les deux
 * via le même chemin `/iframe`.
 */
export function getStreamEmbedUrl(tokenOrUid: string): string {
	return `https://iframe.cloudflarestream.com/${tokenOrUid}`;
}

/* ─── 6. Webhook signature (HMAC-SHA256 envoyé par Cloudflare) ──────────── */

/**
 * Vérifie la signature `Webhook-Signature` envoyée par Cloudflare Stream.
 * Format header : `time=<unix>,sig1=<hex>` ; payload signé = `<time>.<rawBody>`.
 * Renvoie `true` si la signature est valide ET datée de moins de 5 min.
 */
export async function verifyStreamWebhookSignature(
	rawBody: string,
	signatureHeader: string | null
): Promise<boolean> {
	const secret = env.CLOUDFLARE_STREAM_WEBHOOK_SECRET;
	if (!secret || !signatureHeader) return false;

	const parts = Object.fromEntries(
		signatureHeader.split(',').map((kv) => {
			const [k, v] = kv.split('=');
			return [k.trim(), v?.trim() ?? ''];
		})
	);
	const time = parts.time;
	const sig = parts.sig1;
	if (!time || !sig) return false;

	const ageSec = Math.abs(Math.floor(Date.now() / 1000) - Number(time));
	if (!Number.isFinite(ageSec) || ageSec > 300) return false;

	const enc = new TextEncoder();
	const key = await crypto.subtle.importKey(
		'raw',
		enc.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const mac = await crypto.subtle.sign('HMAC', key, enc.encode(`${time}.${rawBody}`));
	const expected = Array.from(new Uint8Array(mac))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');

	return timingSafeEqualHex(expected, sig);
}

function timingSafeEqualHex(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) {
		diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return diff === 0;
}

/* ─── 7. Liste de toutes les vidéos du compte (sync admin) ─────────────── */

export type CloudflareVideoListItem = {
	uid: string;
	title: string;
	status: string;
	duration: number | null;
	thumbnail: string | null;
	created: string | null;
};

/**
 * Récupère toutes les vidéos Cloudflare Stream du compte avec pagination curseur.
 * Utilisé par la page /admin/videos/sync pour importer les nouvelles vidéos en DB.
 */
export async function listCloudflareVideos(): Promise<CloudflareVideoListItem[]> {
	const base = getStreamBaseUrl();
	const results: CloudflareVideoListItem[] = [];
	let after: string | undefined;

	do {
		const url = new URL(base);
		url.searchParams.set('limit', '100');
		if (after) url.searchParams.set('after', after);

		const res = await fetch(url.toString(), {
			headers: { Authorization: streamAuthHeaders().Authorization }
		});

		if (!res.ok) {
			const err = await res.text();
			throw new Error(`Cloudflare Stream list error ${res.status}: ${err}`);
		}

		const data = (await res.json()) as {
			result: Array<{
				uid: string;
				meta?: { name?: string };
				status?: { state?: string };
				duration?: number;
				thumbnail?: string;
				created?: string;
			}>;
		};

		const batch = data.result ?? [];
		for (const v of batch) {
			results.push({
				uid: v.uid,
				title: v.meta?.name ?? v.uid,
				status: v.status?.state ?? 'unknown',
				duration: typeof v.duration === 'number' && v.duration > 0 ? v.duration : null,
				thumbnail: v.thumbnail ?? null,
				created: v.created ?? null
			});
		}

		// Cloudflare pagination : si le batch est plein (100), on continue avec le dernier UID
		after = batch.length === 100 ? batch[batch.length - 1]?.uid : undefined;
	} while (after);

	return results;
}
