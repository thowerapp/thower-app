import { env } from '$env/dynamic/private';
import { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_API_TOKEN } from '$env/static/private';

const BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream`;

const STREAM_AUTH_HEADERS = {
	Authorization: `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}`,
	'Content-Type': 'application/json'
} as const;

/* ─── 1. Upload direct (tus) ────────────────────────────────────────────── */

export type CreateDirectUploadOptions = {
	maxDurationSeconds?: number;
	requireSignedURLs?: boolean;
	meta?: Record<string, string>;
};

/**
 * Crée une URL d'upload directe (tus). Le navigateur uploade le fichier en
 * direct vers Cloudflare via cette URL — aucun byte ne transite par notre serveur.
 * `requireSignedURLs:true` impose un token signé pour lire la vidéo ensuite.
 */
export async function createDirectUploadUrl(
	options: CreateDirectUploadOptions = {}
): Promise<{ uploadURL: string; uid: string }> {
	const res = await fetch(`${BASE_URL}/direct_upload`, {
		method: 'POST',
		headers: STREAM_AUTH_HEADERS,
		body: JSON.stringify({
			maxDurationSeconds: options.maxDurationSeconds ?? 7200,
			requireSignedURLs: options.requireSignedURLs ?? true,
			meta: options.meta ?? undefined
		})
	});

	if (!res.ok) {
		const err = await res.text();
		throw new Error(`Cloudflare Stream direct_upload error ${res.status}: ${err}`);
	}

	const data = await res.json();
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
	const res = await fetch(`${BASE_URL}/${uid}`, {
		headers: { Authorization: `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}` }
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
	const res = await fetch(`${BASE_URL}/${uid}`, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}` }
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

	const res = await fetch(`${BASE_URL}/${uid}/token`, {
		method: 'POST',
		headers: STREAM_AUTH_HEADERS,
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
