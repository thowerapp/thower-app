import { prisma } from '$lib/server';
import type { VideoFormCoreInput } from '$lib/schema/video/videoAdminSchema';

/** Mise à jour des métadonnées d'une vidéo (sans toucher à l'UID Cloudflare). */
export async function updateVideo(id: string, data: VideoFormCoreInput) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const db = prisma as any;

	if (data.kind === 'workout') {
		if (!data.position) {
			throw new Error('position est requise pour une vidéo sport.');
		}
		if (!data.sessionType) {
			throw new Error('sessionType est requis pour une vidéo sport.');
		}
		return db.workoutVideo.update({
			where: { id },
			data: {
				title: data.title,
				sessionType: data.sessionType,
				position: data.position,
				isOptional: data.isOptional ?? false
			}
		});
	}

	if (!data.category) {
		throw new Error('category est requis pour une vidéo Découverte.');
	}
	return db.discoveryContent.update({
		where: { id },
		data: {
			category: data.category,
			title: data.title,
			order: data.order ?? 0
		}
	});
}

export async function getVideoById(kind: 'workout' | 'discovery', id: string) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const db = prisma as any;
	if (kind === 'workout') {
		return db.workoutVideo.findUnique({ where: { id } });
	}
	return db.discoveryContent.findUnique({ where: { id } });
}
