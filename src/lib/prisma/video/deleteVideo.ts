import { prisma } from '$lib/server';
import { deleteStreamVideo } from '$lib/server/cloudflare-stream';

/**
 * Supprime d’abord la vidéo sur Cloudflare Stream (404 = déjà retirée, OK),
 * puis la ligne Prisma. Si Stream échoue hors 404, on n’efface pas la DB pour
 * éviter une vidéo orpheline côté Cloudflare.
 */
export async function deleteVideo(kind: 'workout' | 'discovery', id: string) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const db = prisma as any;

	const row =
		kind === 'workout'
			? await db.workoutVideo.findUnique({ where: { id }, select: { cloudflareUid: true } })
			: await db.discoveryContent.findUnique({ where: { id }, select: { cloudflareUid: true } });

	if (!row) return;

	if (row.cloudflareUid && !row.cloudflareUid.startsWith('cf_seed_')) {
		await deleteStreamVideo(row.cloudflareUid);
	}

	if (kind === 'workout') {
		await db.workoutVideo.delete({ where: { id } });
		return;
	}

	await db.programDayItem.deleteMany({ where: { discoveryContentId: id } });
	await db.discoveryContent.delete({ where: { id } });
}
