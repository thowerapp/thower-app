import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { verifyStreamWebhookSignature } from '$lib/server/cloudflare-stream';
import { prisma } from '$lib/server';

/**
 * Webhook Cloudflare Stream : appelé à chaque transition d'état (ready, error, …).
 * Signature : `Webhook-Signature: time=…,sig1=…` — voir cloudflare-stream.ts.
 *
 * Doc : https://developers.cloudflare.com/stream/manage-video-library/using-webhooks/
 *
 * Met à jour `status`, `durationSeconds` et `thumbnailUrl` côté DB pour la
 * vidéo dont l'UID matche, qu'elle soit WorkoutVideo ou DiscoveryContent.
 */
export const POST: RequestHandler = async ({ request }) => {
	const rawBody = await request.text();
	const sig = request.headers.get('webhook-signature');

	const valid = await verifyStreamWebhookSignature(rawBody, sig);
	if (!valid) {
		return json({ error: 'invalid signature' }, { status: 401 });
	}

	let payload: {
		uid?: string;
		status?: { state?: string };
		duration?: number;
		thumbnail?: string;
		readyToStream?: boolean;
	};
	try {
		payload = JSON.parse(rawBody);
	} catch {
		return json({ error: 'invalid json' }, { status: 400 });
	}

	const uid = payload.uid;
	if (!uid) return json({ error: 'missing uid' }, { status: 400 });

	const state = payload.status?.state ?? 'pending';
	const data: Record<string, unknown> = {
		status: state === 'ready' ? 'ready' : state,
		thumbnailUrl: payload.thumbnail ?? null
	};
	if (typeof payload.duration === 'number' && payload.duration > 0) {
		data.durationSeconds = payload.duration;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const db = prisma as any;

	const [workoutUpdated, discoveryUpdated] = await Promise.all([
		db.workoutVideo
			.updateMany({ where: { cloudflareUid: uid }, data })
			.catch(() => ({ count: 0 })),
		db.discoveryContent
			.updateMany({ where: { cloudflareUid: uid }, data })
			.catch(() => ({ count: 0 }))
	]);

	console.log(
		`[stream-webhook] uid=${uid} state=${state} workout=${workoutUpdated.count} discovery=${discoveryUpdated.count}`
	);

	return json({ ok: true });
};
