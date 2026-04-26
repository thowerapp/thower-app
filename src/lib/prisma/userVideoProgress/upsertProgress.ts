import { prisma } from '$lib/server';

/**
 * Seuil de complétion : une vidéo est considérée vue à 80 % de sa durée
 * (ou si l'événement player "ended" est reçu — voir route progress).
 */
export const VIDEO_COMPLETION_THRESHOLD = 0.8;

/**
 * Calcul pur (sans I/O) : détermine si la progression doit déclencher une complétion.
 * - `maxPositionSec` : position max atteinte après la mise à jour en cours.
 * - `durationSeconds` : durée totale connue de la vidéo (null = inconnue).
 * - `ended` : l'événement "ended" du player a été reçu.
 * - `alreadyCompleted` : la vidéo était déjà marquée complète en base.
 * Retourne `true` uniquement lors de la **première** complétion.
 */
export function computeCompletion(
	maxPositionSec: number,
	durationSeconds: number | null,
	ended: boolean,
	alreadyCompleted: boolean
): boolean {
	if (alreadyCompleted) return false;
	if (ended) return true;
	if (!durationSeconds) return false;
	return maxPositionSec >= durationSeconds * VIDEO_COMPLETION_THRESHOLD;
}

export type UpsertVideoProgressInput =
	| { kind: 'workout'; userId: string; workoutVideoId: string; positionSec: number; ended?: boolean }
	| { kind: 'discovery'; userId: string; discoveryContentId: string; positionSec: number; ended?: boolean };

export type UpsertVideoProgressResult = {
	maxPositionSec: number;
	completedNow: boolean;
	alreadyCompleted: boolean;
	durationSeconds: number | null;
};

/**
 * Upsert la progression d'un utilisateur sur une vidéo (sport ou découverte) et
 * marque `completedAt` si seuil atteint. Retourne `completedNow:true` la première
 * fois que la complétion est franchie pour permettre au caller d'attribuer les points.
 */
export async function upsertVideoProgress(
	input: UpsertVideoProgressInput
): Promise<UpsertVideoProgressResult> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const db = prisma as any;
	const now = new Date();

	if (input.kind === 'workout') {
		const video = await db.workoutVideo.findUnique({
			where: { id: input.workoutVideoId },
			select: { id: true, durationSeconds: true }
		});
		if (!video) throw new Error('WorkoutVideo introuvable.');

		const existing = await db.userVideoProgress.findFirst({
			where: { userId: input.userId, workoutVideoId: input.workoutVideoId }
		});
		const previousMax = existing?.maxPositionSec ?? 0;
		const newMax = Math.max(previousMax, Math.max(0, input.positionSec));

		const shouldComplete = computeCompletion(
			newMax,
			video.durationSeconds ?? null,
			input.ended === true,
			!!existing?.completedAt
		);

		const data = {
			maxPositionSec: newMax,
			lastHeartbeatAt: now,
			...(shouldComplete ? { completedAt: now } : {})
		};

		if (existing) {
			await db.userVideoProgress.update({
				where: { id: existing.id },
				data
			});
		} else {
			await db.userVideoProgress.create({
				data: {
					userId: input.userId,
					workoutVideoId: input.workoutVideoId,
					...data
				}
			});
		}

		return {
			maxPositionSec: newMax,
			completedNow: shouldComplete,
			alreadyCompleted: !!existing?.completedAt,
			durationSeconds: video.durationSeconds ?? null
		};
	}

	const content = await db.discoveryContent.findUnique({
		where: { id: input.discoveryContentId },
		select: { id: true, durationSeconds: true }
	});
	if (!content) throw new Error('DiscoveryContent introuvable.');

	const existing = await db.userVideoProgress.findFirst({
		where: { userId: input.userId, discoveryContentId: input.discoveryContentId }
	});
	const previousMax = existing?.maxPositionSec ?? 0;
	const newMax = Math.max(previousMax, Math.max(0, input.positionSec));

	const shouldComplete = computeCompletion(
		newMax,
		content.durationSeconds ?? null,
		input.ended === true,
		!!existing?.completedAt
	);

	const data = {
		maxPositionSec: newMax,
		lastHeartbeatAt: now,
		...(shouldComplete ? { completedAt: now } : {})
	};

	if (existing) {
		await db.userVideoProgress.update({
			where: { id: existing.id },
			data
		});
	} else {
		await db.userVideoProgress.create({
			data: {
				userId: input.userId,
				discoveryContentId: input.discoveryContentId,
				...data
			}
		});
	}

	return {
		maxPositionSec: newMax,
		completedNow: shouldComplete,
		alreadyCompleted: !!existing?.completedAt,
		durationSeconds: content.durationSeconds ?? null
	};
}
