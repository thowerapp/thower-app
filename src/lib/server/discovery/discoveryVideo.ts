import type { DiscoveryCategory } from '@prisma/client';
import { prisma } from '$lib/server';
import { POINTS } from '$lib/server/pointsConfig';
import { upsertVideoProgress } from '$lib/prisma/userVideoProgress/upsertProgress';
import { autoCompleteVideoTask } from '$lib/prisma/dailyTask/autoCompleteVideoTask';

export type DiscoveryVideoView = {
	id: string;
	title: string;
	videoSrc: string | null;
	thumbSrc: string | null;
	isLocal: boolean;
	watched: boolean;
};

const OBJECT_ID = /^[0-9a-f]{24}$/i;

/** Contenu Découverte actif de la catégorie, ou `null` (id invalide, inactif ou d'une autre catégorie). */
export async function loadDiscoveryVideo(
	userId: string,
	id: string,
	category: DiscoveryCategory
): Promise<DiscoveryVideoView | null> {
	if (!OBJECT_ID.test(id)) return null;

	const content = await prisma.discoveryContent.findUnique({
		where: { id },
		select: { id: true, title: true, cloudflareUid: true, thumbnailUrl: true, category: true, active: true }
	});
	if (!content || !content.active || content.category !== category) return null;

	const progress = await prisma.userVideoProgress.findFirst({
		where: { userId, discoveryContentId: id, completedAt: { not: null } },
		select: { id: true }
	});

	const isLocal = content.cloudflareUid.startsWith('local:');
	return {
		id: content.id,
		title: content.title,
		videoSrc: isLocal ? encodeURI(content.cloudflareUid.slice(6)) : null,
		thumbSrc: content.thumbnailUrl ? encodeURI(content.thumbnailUrl) : null,
		isLocal,
		watched: !!progress
	};
}

/**
 * Marque une vidéo locale comme vue (fin de lecture) et retourne les points gagnés :
 * ceux de la tâche du jour liée si elle existe, sinon `POINTS.VIDEO_WATCHED` ; 0 si déjà vue.
 */
export async function markDiscoveryWatched(
	userId: string,
	discoveryContentId: string,
	source: string
): Promise<number> {
	const result = await upsertVideoProgress({
		kind: 'discovery',
		userId,
		discoveryContentId,
		positionSec: 9999,
		ended: true
	});
	if (!result.completedNow) return 0;

	const linkedTask = await prisma.dailyTask.findFirst({
		where: { type: 'VIDEO', active: true, discoveryContentId },
		select: { id: true }
	});
	if (linkedTask) return autoCompleteVideoTask(userId, discoveryContentId);

	await prisma.pointEvent.create({
		data: {
			userId,
			type: 'VIDEO_WATCHED',
			amount: POINTS.VIDEO_WATCHED,
			metadata: { discoveryContentId, source }
		}
	});
	return POINTS.VIDEO_WATCHED;
}
