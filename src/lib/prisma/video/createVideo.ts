import { prisma } from '$lib/server';
import type { VideoFormCoreInput } from '$lib/schema/video/videoAdminSchema';

/**
 * Crée la fiche Prisma correspondant à une vidéo Cloudflare déjà uploadée
 * (l'UID est généré côté Cloudflare via createDirectUploadUrl puis utilisé ici).
 */
export async function createVideo(data: VideoFormCoreInput) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const db = prisma as any;

	if (data.kind === 'workout') {
		if (!data.sessionId || !data.position) {
			throw new Error('sessionId et position sont requis pour une vidéo sport.');
		}
		return db.workoutVideo.create({
			data: {
				sessionId: data.sessionId,
				cloudflareUid: data.cloudflareUid,
				title: data.title,
				position: data.position,
				isOptional: data.isOptional ?? false,
				order: data.order ?? 0,
				status: 'pending'
			}
		});
	}

	if (!data.category) {
		throw new Error('category est requis pour une vidéo Découverte.');
	}
	return db.discoveryContent.create({
		data: {
			category: data.category,
			title: data.title,
			cloudflareUid: data.cloudflareUid,
			order: data.order ?? 0,
			unlockThreshold: data.unlockThreshold ?? 0,
			breathworkIntent: data.breathworkIntent ?? null,
			tags: data.tags ?? [],
			active: true,
			status: 'pending'
		}
	});
}
