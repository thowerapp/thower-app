import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { videoKindEnum } from '$lib/schema/video/videoAdminSchema';
import { createSignedPlaybackToken, getStreamEmbedUrl } from '$lib/server/cloudflare-stream';
import { prisma } from '$lib/server';

/**
 * Délivre un token de lecture signé Cloudflare pour la vidéo demandée.
 * Authentification utilisateur obligatoire ; on vérifie aussi que la vidéo
 * existe et que son `cloudflareUid` n'est pas un placeholder de seed.
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, 'Authentification requise.');
	}

	const kind = videoKindEnum.parse(params.kind);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const db = prisma as any;

	const row =
		kind === 'workout'
			? await db.workoutVideo.findUnique({
					where: { id: params.id },
					select: { cloudflareUid: true, status: true }
				})
			: await db.discoveryContent.findUnique({
					where: { id: params.id },
					select: { cloudflareUid: true, status: true, active: true }
				});

	if (!row) throw error(404, 'Vidéo introuvable.');
	if (row.cloudflareUid?.startsWith('cf_seed_')) {
		throw error(409, 'Vidéo de seed — uploader le fichier sur Cloudflare avant de la jouer.');
	}
	if (row.status !== 'ready') {
		throw error(409, 'Vidéo non encore prête (transcodage en cours côté Cloudflare).');
	}
	if (kind === 'discovery' && row.active === false) {
		throw error(403, 'Vidéo désactivée.');
	}

	try {
		const token = await createSignedPlaybackToken(row.cloudflareUid, {
			expiresInSeconds: 7200,
			userId: locals.user.id
		});
		return json({
			token,
			embedUrl: getStreamEmbedUrl(token),
			expiresInSeconds: 7200
		});
	} catch (err) {
		console.error('[playback-token] error', err);
		throw error(500, 'Impossible de générer le token de lecture.');
	}
};
