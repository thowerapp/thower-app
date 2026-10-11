import { prisma } from '$lib/server';
import type { VideoFormCoreInput } from '$lib/schema/video/videoAdminSchema';
import { invalidateSportPlan } from '$lib/server/sport/sportPlanCache';

/** Mise à jour des métadonnées d'une vidéo (sans toucher à l'UID Cloudflare). */
export async function updateVideo(id: string, data: VideoFormCoreInput) {

	if (data.kind === 'workout') {
		if (!data.position) {
			throw new Error('position est requise pour une vidéo sport.');
		}
		if (!data.sessionType) {
			throw new Error('sessionType est requis pour une vidéo sport.');
		}
		const updated = await prisma.workoutVideo.update({
			where: { id },
			data: {
				title: data.title,
				sessionType: data.sessionType,
				position: data.position,
				isOptional: data.isOptional ?? false
			}
		});
		invalidateSportPlan();
		return updated;
	}

	if (!data.category) {
		throw new Error('category est requis pour une vidéo Découverte.');
	}
	return prisma.discoveryContent.update({
		where: { id },
		data: {
			category: data.category,
			title: data.title,
			order: data.order ?? 0
		}
	});
}

export async function getVideoById(kind: 'workout' | 'discovery', id: string) {
	if (kind === 'workout') {
		return prisma.workoutVideo.findUnique({ where: { id } });
	}
	return prisma.discoveryContent.findUnique({ where: { id } });
}
