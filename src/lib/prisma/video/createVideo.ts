import { prisma } from '$lib/server';
import type { ChecklistTaskSchema, VideoFormCoreInput } from '$lib/schema/video/videoAdminSchema';

/**
 * Crée la fiche Prisma correspondant à une vidéo Cloudflare déjà uploadée
 * (l'UID est généré côté Cloudflare via createDirectUploadUrl puis utilisé ici).
 * Avec `checklist` (Découverte uniquement), crée aussi la `DailyTask` VIDEO qui la fait
 * apparaître dans la checklist des jours `fromDay`–`untilDay`.
 */
export async function createVideo(data: VideoFormCoreInput, checklist?: ChecklistTaskSchema) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const db = prisma as any;

	if (data.kind === 'workout') {
		if (!data.position) {
			throw new Error('position est requise pour une vidéo sport.');
		}
		if (!data.sessionType) {
			throw new Error('sessionType est requis pour une vidéo sport.');
		}
		return db.workoutVideo.create({
			data: {
				cloudflareUid: data.cloudflareUid,
				title: data.title,
				sessionType: data.sessionType,
				position: data.position,
				isOptional: data.isOptional ?? false,
				status: 'pending'
			}
		});
	}

	if (!data.category) {
		throw new Error('category est requis pour une vidéo Découverte.');
	}
	let dailyTasks: object | undefined;
	if (checklist) {
		const last = await db.dailyTask.findFirst({ orderBy: { order: 'desc' }, select: { order: true } });
		dailyTasks = {
			create: {
				label: checklist.label?.trim() || `Regarde la vidéo : ${data.title}`,
				type: 'VIDEO',
				points: checklist.points,
				order: (last?.order ?? -1) + 1,
				active: true,
				showFromDay: checklist.fromDay,
				showUntilDay: checklist.untilDay
			}
		};
	}

	return db.discoveryContent.create({
		data: {
			category: data.category,
			title: data.title,
			cloudflareUid: data.cloudflareUid,
			order: data.order ?? 0,
			active: true,
			status: 'pending',
			...(dailyTasks ? { dailyTasks } : {})
		}
	});
}
