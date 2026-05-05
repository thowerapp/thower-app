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
import { attachDaySchema, detachDaySchema, type DetachDaySchema } from '$lib/schema/video/attachDaySchema';
import { listProgramDayItemsForVideo } from '$lib/prisma/programDayItem/listForVideo';
import { attachVideoToDay } from '$lib/prisma/programDayItem/attachVideo';
import { detachProgramDayItem } from '$lib/prisma/programDayItem/detach';

export const load: PageServerLoad = async ({ params, locals, depends }) => {
	if (!locals.user || locals.role !== 'ADMIN') {
		throw redirect(302, '/admin');
	}

	depends('app:admin-video-program-items');

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
					tags: [],
					attachToProgramDay: false,
					programDayAttach: undefined
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
					tags: row.tags ?? [],
					attachToProgramDay: false,
					programDayAttach: undefined
				};

	const form = await superValidate(initial, zod(updateVideoSchema));

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
			const d = form.data as UpdateVideoSchema;
			const { attachToProgramDay, programDayAttach, ...core } = d;
			await updateVideo(params.id, { ...core, kind });

			let attachTail = '';
			if (attachToProgramDay && programDayAttach) {
				const r = await attachVideoToDay({
					kind: d.kind,
					videoId: params.id,
					dayIndex: programDayAttach.dayIndex,
					type: programDayAttach.type,
					points: programDayAttach.points,
					label: programDayAttach.label ?? null
				});
				attachTail = r.created
					? ` Rattachement ajouté (jour ${r.dayIndex}).`
					: ` Déjà présente sur ce jour (${r.dayIndex}).`;
			}

			return message(form, ('Vidéo mise à jour.' + attachTail).trim());
		} catch (err) {
			console.error('[admin/videos/[kind]/[id]] updateVideo error', err);
			return fail(500, {
				form,
				message:
					err instanceof Error ? err.message : 'Erreur lors de la mise à jour.'
			});
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

	/** Rattache la vidéo à un jour du programme (indépendamment du formulaire principal). */
	attachToDay: async ({ request, params, locals }) => {
		if (!locals.user || locals.role !== 'ADMIN') {
			return fail(403, { error: 'Accès refusé.' });
		}
		const kind = videoKindEnum.parse(params.kind);
		const formData = await request.formData();

		const parsed = attachDaySchema.safeParse({
			dayIndex: formData.get('dayIndex'),
			type: formData.get('type'),
			points: formData.get('points') ?? 0,
			label: formData.get('label') || null
		});
		if (!parsed.success) {
			return fail(400, {
				error: 'Données invalides : ' + parsed.error.issues.map((i) => i.message).join(', ')
			});
		}

		try {
			const result = await attachVideoToDay({ kind, videoId: params.id, ...parsed.data });
			if (!result.created) {
				return fail(409, { error: `Déjà rattachée au jour ${result.dayIndex}.` });
			}
			return { success: true, dayIndex: result.dayIndex };
		} catch (err) {
			console.error('[admin/videos/[kind]/[id]] attachToDay error', err);
			return fail(500, { error: err instanceof Error ? err.message : 'Erreur lors du rattachement.' });
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
