import { zod } from '$lib/superforms-zod';
import type { PageServerLoad, Actions } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { fail, message, superValidate } from 'sveltekit-superforms';
import {
	updateVideoSchema,
	videoKindEnum,
	type UpdateVideoSchema
} from '$lib/schema/video/videoAdminSchema';
import { getVideoById, updateVideo } from '$lib/prisma/video/updateVideo';
import {
	createSignedPlaybackToken,
	getStreamEmbedUrl,
	getVideoDetails
} from '$lib/server/cloudflare-stream';
import { prisma } from '$lib/server';
import { serializeData } from '$lib/utils/serializeData';
import {
	attachDaySchema,
	detachDaySchema,
	type AttachDaySchema,
	type DetachDaySchema
} from '$lib/schema/video/attachDaySchema';
import { listProgramDayItemsForVideo } from '$lib/prisma/programDayItem/listForVideo';
import { attachVideoToDay } from '$lib/prisma/programDayItem/attachVideo';
import { detachProgramDayItem } from '$lib/prisma/programDayItem/detach';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user || locals.role !== 'ADMIN') {
		throw redirect(302, '/admin');
	}

	const kind = videoKindEnum.parse(params.kind);
	const row = await getVideoById(kind, params.id);
	if (!row) throw error(404, 'Vidéo introuvable.');

	// Synchro opportuniste avec Cloudflare (durée / statut / vignette)
	let cloudflareDetails = null;
	if (row.cloudflareUid && !String(row.cloudflareUid).startsWith('cf_seed_')) {
		try {
			cloudflareDetails = await getVideoDetails(row.cloudflareUid);
		} catch (err) {
			console.error('[admin/videos/[kind]/[id]] getVideoDetails error', err);
		}
	}

	// Token de preview signé pour l'admin (lecture sans contrainte côté Cloudflare si pending)
	let previewEmbedUrl: string | null = null;
	if (cloudflareDetails?.readyToStream) {
		try {
			const token = await createSignedPlaybackToken(row.cloudflareUid, {
				expiresInSeconds: 3600,
				userId: locals.user.id
			});
			previewEmbedUrl = getStreamEmbedUrl(token);
		} catch (err) {
			console.error('[admin/videos/[kind]/[id]] preview token error', err);
		}
	}

	const initial: UpdateVideoSchema =
		kind === 'workout'
			? {
					kind: 'workout',
					cloudflareUid: row.cloudflareUid,
					title: row.title,
					order: row.order ?? 0,
					sessionId: row.sessionId,
					position: row.position,
					isOptional: row.isOptional ?? false,
					category: null,
					unlockThreshold: 0,
					breathworkIntent: null,
					tags: []
				}
			: {
					kind: 'discovery',
					cloudflareUid: row.cloudflareUid,
					title: row.title,
					order: row.order ?? 0,
					sessionId: null,
					position: null,
					isOptional: false,
					category: row.category,
					unlockThreshold: row.unlockThreshold ?? 0,
					breathworkIntent: row.breathworkIntent ?? null,
					tags: row.tags ?? []
				};

	const form = await superValidate(initial, zod(updateVideoSchema));

	// Type d'item ProgramDay par défaut selon le kind / la category
	const defaultAttachType: AttachDaySchema['type'] =
		kind === 'workout'
			? 'SPORT_SESSION'
			: row.category === 'BREATHWORK'
				? 'BREATHWORK'
				: row.category === 'MINDSET'
					? 'MINDSET_VIDEO'
					: 'VIDEO_OF_DAY';

	const attachForm = await superValidate(
		{ dayIndex: 1, type: defaultAttachType, points: 10, label: null },
		zod(attachDaySchema)
	);
	const detachForm = await superValidate(zod(detachDaySchema));

	const programDayItems = await listProgramDayItemsForVideo(kind, params.id);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const db = prisma as any;
	const sessions = db.workoutSession
		? await db.workoutSession.findMany({
				where: { active: true },
				select: { id: true, name: true, type: true },
				orderBy: [{ weekNumber: 'asc' }, { order: 'asc' }]
			})
		: [];

	return {
		form,
		attachForm,
		detachForm,
		kind,
		video: serializeData(row),
		cloudflareDetails,
		previewEmbedUrl,
		sessions,
		programDayItems
	};
};

export const actions: Actions = {
	updateVideo: async ({ request, params, locals }) => {
		if (!locals.user || locals.role !== 'ADMIN') {
			return fail(403, { message: 'Accès refusé.' });
		}
		const kind = videoKindEnum.parse(params.kind);
		const form = await superValidate(request, zod(updateVideoSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			await updateVideo(params.id, { ...(form.data as UpdateVideoSchema), kind });
			return message(form, 'Vidéo mise à jour.');
		} catch (err) {
			console.error('[admin/videos/[kind]/[id]] updateVideo error', err);
			return fail(500, { form, message: 'Erreur lors de la mise à jour.' });
		}
	},

	/** Force la synchronisation des métadonnées depuis Cloudflare (utile si webhook raté). */
	syncFromCloudflare: async ({ params, locals }) => {
		if (!locals.user || locals.role !== 'ADMIN') {
			return fail(403, { message: 'Accès refusé.' });
		}
		const kind = videoKindEnum.parse(params.kind);
		const row = await getVideoById(kind, params.id);
		if (!row) return fail(404, { message: 'Vidéo introuvable.' });

		try {
			const details = await getVideoDetails(row.cloudflareUid);
			if (!details) return fail(404, { message: 'Vidéo absente côté Cloudflare.' });

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const db = prisma as any;
			const data = {
				durationSeconds: details.duration ?? null,
				status: details.status === 'ready' ? 'ready' : details.status,
				thumbnailUrl: details.thumbnail ?? null
			};
			if (kind === 'workout') {
				await db.workoutVideo.update({ where: { id: params.id }, data });
			} else {
				await db.discoveryContent.update({ where: { id: params.id }, data });
			}
			return { success: true };
		} catch (err) {
			console.error('[admin/videos/[kind]/[id]] sync error', err);
			return fail(500, { message: 'Erreur de synchronisation Cloudflare.' });
		}
	},

	/** Rattache la vidéo à un jour 1..91 du programme actif (multi-jours autorisé). */
	attachToDay: async ({ request, params, locals }) => {
		if (!locals.user || locals.role !== 'ADMIN') {
			return fail(403, { message: 'Accès refusé.' });
		}
		const kind = videoKindEnum.parse(params.kind);
		const attachForm = await superValidate(request, zod(attachDaySchema));
		if (!attachForm.valid) {
			return fail(400, { attachForm });
		}
		const data = attachForm.data as AttachDaySchema;
		try {
			const result = await attachVideoToDay({
				kind,
				videoId: params.id,
				dayIndex: data.dayIndex,
				type: data.type,
				points: data.points,
				label: data.label ?? null
			});
			return message(
				attachForm,
				result.created
					? `Vidéo rattachée au jour ${result.dayIndex}.`
					: `Vidéo déjà rattachée au jour ${result.dayIndex}.`
			);
		} catch (err) {
			console.error('[admin/videos/[kind]/[id]] attachToDay error', err);
			return fail(500, {
				attachForm,
				message: err instanceof Error ? err.message : 'Erreur de rattachement.'
			});
		}
	},

	/** Détache un ProgramDayItem (supprime le rattachement vidéo ↔ jour). */
	detachFromDay: async ({ request, locals }) => {
		if (!locals.user || locals.role !== 'ADMIN') {
			return fail(403, { message: 'Accès refusé.' });
		}
		const detachForm = await superValidate(request, zod(detachDaySchema));
		if (!detachForm.valid) {
			return fail(400, { detachForm });
		}
		const data = detachForm.data as DetachDaySchema;
		try {
			await detachProgramDayItem(data.programDayItemId);
			return message(detachForm, 'Rattachement supprimé.');
		} catch (err) {
			console.error('[admin/videos/[kind]/[id]] detachFromDay error', err);
			return fail(500, { detachForm, message: 'Erreur de détachement.' });
		}
	}
};
