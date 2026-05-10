import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { videoKindEnum } from '$lib/schema/video/videoAdminSchema';
import { upsertVideoProgress } from '$lib/prisma/userVideoProgress/upsertProgress';
import { createPointEvent } from '$lib/prisma/pointEvent/createEvent';
import { autoCompleteVideoTask } from '$lib/prisma/dailyTask/autoCompleteVideoTask';
import { prisma } from '$lib/server';

function startOfUtcDay(): Date {
	const d = new Date();
	d.setUTCHours(0, 0, 0, 0);
	return d;
}

const bodySchema = z.object({
	positionSec: z.number().min(0).max(86400),
	ended: z.boolean().optional()
});

/** Points attribués à la première complétion d'une vidéo (cohérent avec le seed). */
const VIDEO_COMPLETION_POINTS = 10;

/**
 * Heartbeat de progression vidéo + complétion.
 *
 * - upsert UserVideoProgress (max position + completedAt si seuil 90 % ou ended)
 * - quand on bascule pour la première fois en complété :
 *     a) crée un PointEvent VIDEO_WATCHED (+10 pts)
 *     b) si la vidéo est rattachée à un ProgramDayItem du programme actif et que
 *        l'utilisateur n'a pas encore validé cet item, crée la
 *        UserProgramDayItemCompletion correspondante.
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		throw error(401, 'Authentification requise.');
	}
	const userId = locals.user.id;
	const kind = videoKindEnum.parse(params.kind);

	let body: z.infer<typeof bodySchema>;
	try {
		body = bodySchema.parse(await request.json());
	} catch (err) {
		throw error(400, err instanceof Error ? err.message : 'Payload invalide.');
	}

	const result = await upsertVideoProgress(
		kind === 'workout'
			? { kind, userId, workoutVideoId: params.id, positionSec: body.positionSec, ended: body.ended }
			: {
					kind,
					userId,
					discoveryContentId: params.id,
					positionSec: body.positionSec,
					ended: body.ended
				}
	);

	if (result.completedNow) {
		const meta: Record<string, unknown> = { kind, videoId: params.id };
		try {
			await createPointEvent({
				userId,
				type: 'VIDEO_WATCHED',
				amount: VIDEO_COMPLETION_POINTS,
				metadata: meta
			});
		} catch (err) {
			console.error('[videos/progress] createPointEvent error', err);
		}

		// Checklist jour : même logique que markWatched (points tâche + complétion)
		if (kind === 'discovery') {
			try {
				await autoCompleteVideoTask(userId, params.id);
			} catch (err) {
				console.error('[videos/progress] autoCompleteVideoTask error', err);
			}
		}

		// Si la vidéo est référencée par un item du programme 91j non encore complété,
		// on coche automatiquement l'item (logique gamification "vidéo du jour").
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const db = prisma as any;
			const where =
				kind === 'discovery'
					? { discoveryContentId: params.id }
					: { workoutSession: { videos: { some: { id: params.id } } } };
			const items = await db.programDayItem.findMany({
				where,
				select: { id: true }
			});
			for (const item of items) {
				await db.userProgramDayItemCompletion
					.create({ data: { userId, programDayItemId: item.id } })
					.catch(() => {
						/* ignore unique constraint : déjà coché */
					});
			}
		} catch (err) {
			console.error('[videos/progress] programDayItem completion error', err);
		}
	}

	return json({
		maxPositionSec: result.maxPositionSec,
		completedNow: result.completedNow,
		alreadyCompleted: result.alreadyCompleted,
		durationSeconds: result.durationSeconds
	});
};
