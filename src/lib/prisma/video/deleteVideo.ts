import { prisma } from '$lib/server';
import { deleteStreamVideo } from '$lib/server/cloudflare-stream';
import { invalidateSportPlan } from '$lib/server/sport/sportPlanCache';

/**
 * Supprime d’abord la vidéo sur Cloudflare Stream (404 = déjà retirée, OK),
 * puis la ligne Prisma. Si Stream échoue hors 404, on n’efface pas la DB pour
 * éviter une vidéo orpheline côté Cloudflare.
 */
export async function deleteVideo(kind: 'workout' | 'discovery', id: string) {

	const row =
		kind === 'workout'
			? await prisma.workoutVideo.findUnique({ where: { id }, select: { cloudflareUid: true } })
			: await prisma.discoveryContent.findUnique({ where: { id }, select: { cloudflareUid: true } });

	if (!row) return;

	if (row.cloudflareUid && !row.cloudflareUid.startsWith('cf_seed_')) {
		await deleteStreamVideo(row.cloudflareUid);
	}

	if (kind === 'workout') {
		await prisma.workoutVideo.delete({ where: { id } });
		invalidateSportPlan();
		return;
	}

	await prisma.programDayItem.deleteMany({ where: { discoveryContentId: id } });
	await prisma.discoveryContent.delete({ where: { id } });
}
