import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { videoKindEnum } from '$lib/schema/video/videoAdminSchema';
import { upsertVideoProgress } from '$lib/prisma/userVideoProgress/upsertProgress';
import { autoCompleteVideoTask } from '$lib/prisma/dailyTask/autoCompleteVideoTask';
import { prisma } from '$lib/server';
import { hasSportAccess } from '$lib/server/programAccessGuard';
import { awardPoints } from '$lib/server/awardPoints';


const bodySchema = z.object({
	positionSec: z.number().min(0).max(86400),
	ended: z.boolean().optional()
});

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
	if (kind === 'workout' && !(await hasSportAccess(userId, locals.user.role))) {
		throw error(403, "L'offre sport n'est pas active sur ce compte.");
	}

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
		const meta = { kind, videoId: params.id };

		// Checklist jour : si cette vidéo est rattachée à la DailyTask VIDEO du jour,
		// autoCompleteVideoTask est l'unique source de points (task.points) — on ne
		// doit pas aussi attribuer les points VIDEO_WATCHED génériques ci-dessous,
		// sous peine de compter les points en double.
		let awardedByDailyTask = false;
		if (kind === 'discovery') {
			try {
				const linkedTask = await prisma.dailyTask.findFirst({
					where: { type: 'VIDEO', active: true, discoveryContentId: params.id },
					select: { id: true }
				});
				if (linkedTask) {
					awardedByDailyTask = true;
					await autoCompleteVideoTask(userId, params.id);
				}
			} catch (err) {
				console.error('[videos/progress] autoCompleteVideoTask error', err);
			}
		}

		if (!awardedByDailyTask) {
			try {
				await awardPoints({ userId, type: 'VIDEO_WATCHED', metadata: meta });
			} catch (err) {
				console.error('[videos/progress] awardPoints error', err);
			}
		}

		// Si la vidéo est référencée par un item du programme 91j non encore complété,
		// on coche automatiquement l'item (logique gamification "vidéo du jour").
		try {
			const where =
				kind === 'discovery'
					? { discoveryContentId: params.id }
					: { workoutVideoId: params.id };
			const items = await prisma.programDayItem.findMany({
				where,
				select: { id: true }
			});
			for (const item of items) {
				await prisma.userProgramDayItemCompletion
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
