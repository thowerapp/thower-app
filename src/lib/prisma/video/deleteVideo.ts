import { prisma } from '$lib/server';
import { deleteStreamVideo } from '$lib/server/cloudflare-stream';

/**
 * Supprime la vidéo en base + côté Cloudflare. Si l'appel Cloudflare échoue
 * (ex: vidéo déjà absente), on continue : la base reste cohérente.
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
		try {
			await deleteStreamVideo(row.cloudflareUid);
		} catch (err) {
			console.error('[deleteVideo] Cloudflare delete failed (continuing):', err);
		}
	}

	if (kind === 'workout') {
		await db.workoutVideo.delete({ where: { id } });
	} else {
		await db.discoveryContent.delete({ where: { id } });
	}
}
