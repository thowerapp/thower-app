import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server';
import { listCloudflareVideos } from '$lib/server/cloudflare-stream';
import { getAllAdminVideos } from '$lib/prisma/video/getAllAdminVideos';
import { serializeData } from '$lib/utils/serializeData';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || locals.role !== 'ADMIN') {
		throw redirect(302, '/admin');
	}

	let cfVideos: Awaited<ReturnType<typeof listCloudflareVideos>> = [];
	let cfError: string | null = null;

	try {
		cfVideos = await listCloudflareVideos();
	} catch (err) {
		cfError = err instanceof Error ? err.message : 'Erreur inconnue lors du fetch Cloudflare.';
	}

	const existingVideos = await getAllAdminVideos();
	const registeredUids = new Set(
		existingVideos.map((v) => v.cloudflareUid).filter(Boolean)
	);

	const unregistered = cfVideos.filter((v) => !registeredUids.has(v.uid));
	const registered = cfVideos.filter((v) => registeredUids.has(v.uid));

	return {
		unregistered: serializeData(unregistered),
		registered: serializeData(registered),
		totalCf: cfVideos.length,
		totalDb: existingVideos.length,
		cfError
	};
};

export const actions: Actions = {
	/**
	 * Importe une vidéo Cloudflare comme DiscoveryContent (type découverte par défaut,
	 * inactive). L'admin la configure ensuite via /admin/videos/[kind]/[id].
	 */
	importVideo: async ({ request, locals }) => {
		if (!locals.user || locals.role !== 'ADMIN') {
			return fail(403, { message: 'Accès refusé.' });
		}

		const formData = await request.formData();
		const uid = (formData.get('uid') as string | null)?.trim();
		const title = (formData.get('title') as string | null)?.trim() || uid || 'Sans titre';
		const durationRaw = formData.get('durationSeconds');
		const thumbnailUrl = (formData.get('thumbnailUrl') as string | null)?.trim() || null;
		const status = (formData.get('status') as string | null)?.trim() || 'pending';

		if (!uid) {
			return fail(400, { message: 'UID Cloudflare manquant.' });
		}

		// Vérifier que l'UID n'est pas déjà en DB (doublon)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const db = prisma as any;
		const existing = await db.discoveryContent.findUnique({ where: { cloudflareUid: uid } });
		if (existing) {
			return fail(409, { message: `Vidéo ${uid} déjà enregistrée.` });
		}

		const durationSeconds =
			durationRaw && String(durationRaw).trim() !== ''
				? parseFloat(String(durationRaw))
				: null;

		try {
			await db.discoveryContent.create({
				data: {
					cloudflareUid: uid,
					title: title ?? uid,
					// Catégorie par défaut — l'admin la modifie via la fiche d'édition
					category: 'MOTIVATION',
					order: 0,
					active: false, // inactive jusqu'à configuration par l'admin
					durationSeconds: durationSeconds != null && Number.isFinite(durationSeconds) ? durationSeconds : null,
					thumbnailUrl,
					status
				}
			});
		} catch (err) {
			console.error('[admin/videos/sync] importVideo error', err);
			return fail(500, { message: 'Erreur lors de l\'import.' });
		}

		throw redirect(302, '/admin/videos');
	},

	/**
	 * Purge toutes les vidéos en DB (workout_videos + discovery_contents).
	 * À utiliser avant une re-synchronisation complète.
	 */
	purgeAll: async ({ locals }) => {
		if (!locals.user || locals.role !== 'ADMIN') {
			return fail(403, { message: 'Accès refusé.' });
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const db = prisma as any;

		try {
			await db.workoutVideo.deleteMany({});
			await db.discoveryContent.deleteMany({});
		} catch (err) {
			console.error('[admin/videos/sync] purgeAll error', err);
			return fail(500, { message: 'Erreur lors de la purge.' });
		}

		throw redirect(302, '/admin/videos/sync');
	}
};
