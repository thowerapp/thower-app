import { prisma } from '$lib/server';
import type { UpdateVideoSchema } from '$lib/schema/video/videoAdminSchema';

/** Mise à jour des métadonnées d'une vidéo (sans toucher à l'UID Cloudflare). */
export async function updateVideo(id: string, data: UpdateVideoSchema) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const db = prisma as any;

	if (data.kind === 'workout') {
		if (!data.sessionId || !data.position) {
			throw new Error('sessionId et position sont requis pour une vidéo sport.');
		}
		return db.workoutVideo.update({
			where: { id },
			data: {
				sessionId: data.sessionId,
				title: data.title,
				position: data.position,
				isOptional: data.isOptional ?? false,
				order: data.order ?? 0
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
			order: data.order ?? 0,
			unlockThreshold: data.unlockThreshold ?? 0,
			breathworkIntent: data.breathworkIntent ?? null,
			tags: data.tags ?? []
		}
	});
}

export async function getVideoById(kind: 'workout' | 'discovery', id: string) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const db = prisma as any;
	if (kind === 'workout') {
		return db.workoutVideo.findUnique({
			where: { id },
			include: { session: { select: { id: true, name: true } } }
		});
	}
	return db.discoveryContent.findUnique({ where: { id } });
}
