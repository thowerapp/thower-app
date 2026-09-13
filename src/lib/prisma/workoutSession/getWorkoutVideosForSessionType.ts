import { prisma } from '$lib/server';
import type { WorkoutSessionType, WorkoutVideoPosition } from '@prisma/client';

const POSITION_ORDER: Record<WorkoutVideoPosition, number> = {
	PRE: 0,
	VID1: 1,
	VID2: 2
};

export type SessionWorkoutVideoRow = {
	id: string;
	title: string;
	position: WorkoutVideoPosition;
	order: number;
	status: string;
	cloudflareUid: string;
	durationSeconds: number | null;
	isOptional: boolean;
};

/**
 * Les vidéos sport ne sont plus liées par FK à WorkoutSession : le champ `sessionType`,
 * choisi dans le formulaire admin, fait le lien. Fallback pour les fiches historiques
 * (seed) qui n'ont que la convention d'UID `cf_seed_{slot}_{MAIN_A|MAIN_B|MAIN_C|DISCOVERY}`.
 */
export async function getWorkoutVideosForSessionType(
	sessionType: WorkoutSessionType
): Promise<SessionWorkoutVideoRow[]> {
	const videos = await prisma.workoutVideo.findMany({
		where: {
			OR: [
				{ sessionType },
				{ sessionType: null, cloudflareUid: { endsWith: `_${sessionType}` } }
			]
		}
	});

	return [...videos]
		.sort((a, b) => POSITION_ORDER[a.position] - POSITION_ORDER[b.position])
		.map((v, idx) => ({
			id: v.id,
			title: v.title,
			position: v.position,
			order: POSITION_ORDER[v.position] ?? idx,
			status: v.status,
			cloudflareUid: v.cloudflareUid,
			durationSeconds: v.durationSeconds,
			isOptional: v.isOptional
		}));
}

/**
 * Vidéos d'une séance pour un jour précis du programme (1..91), avec surcharge
 * par jour : l'admin peut rattacher une vidéo à un jour exact via le panneau
 * "Rattacher à un jour" (type SPORT_SESSION) — cette vidéo remplace alors celle
 * du même créneau (PRE/VID1/VID2) dans le set générique de `sessionType`.
 * Sans surcharge pour ce jour, retombe sur `getWorkoutVideosForSessionType`.
 */
export async function getWorkoutVideosForDay(
	dayIndex: number,
	sessionType: WorkoutSessionType
): Promise<SessionWorkoutVideoRow[]> {
	const generic = await getWorkoutVideosForSessionType(sessionType);

	const dayOverrides = await prisma.programDayItem.findMany({
		where: {
			type: 'SPORT_SESSION',
			workoutVideoId: { not: null },
			programDay: { dayIndex, program: { active: true } }
		},
		select: { workoutVideo: true }
	});

	if (dayOverrides.length === 0) return generic;

	const byPosition = new Map(generic.map((v) => [v.position, v]));
	for (const { workoutVideo: v } of dayOverrides) {
		if (!v) continue;
		byPosition.set(v.position, {
			id: v.id,
			title: v.title,
			position: v.position,
			order: POSITION_ORDER[v.position] ?? 0,
			status: v.status,
			cloudflareUid: v.cloudflareUid,
			durationSeconds: v.durationSeconds,
			isOptional: v.isOptional
		});
	}

	return [...byPosition.values()].sort((a, b) => a.order - b.order);
}
