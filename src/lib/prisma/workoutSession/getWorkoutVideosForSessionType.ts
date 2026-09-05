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
