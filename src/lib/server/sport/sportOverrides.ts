import type { SessionWorkoutVideoRow } from './programSportDays';

export type SportOverrideRow = {
	dayIndex: number;
	kind: 'HIDE' | 'REPLACE' | 'ADD';
	workoutVideoIds: string[];
};

const POSITION_ORDER: Record<SessionWorkoutVideoRow['position'], number> = {
	PRE: 0,
	VID1: 1,
	VID2: 2
};

/** Même ordre que le plan global (PRE, VID1, VID2), vidéos conservées dans l'ordre d'arrivée à position égale. */
function orderVideos(videos: SessionWorkoutVideoRow[]): SessionWorkoutVideoRow[] {
	const seen = new Set<string>();
	const unique = videos.filter((v) => !seen.has(v.id) && seen.add(v.id));
	return unique
		.map((video, index) => ({ video, index }))
		.sort(
			(a, b) =>
				POSITION_ORDER[a.video.position] - POSITION_ORDER[b.video.position] || a.index - b.index
		)
		.map(({ video }, order) => ({ ...video, order }));
}

/**
 * Applique les personnalisations d'un utilisateur au plan global (qui n'est jamais modifié : il est partagé).
 * Les overrides sont appliqués dans l'ordre reçu ; les ids de vidéos inconnus sont ignorés.
 */
export function applySportOverrides(
	baseDays: Map<number, SessionWorkoutVideoRow[]>,
	overrides: SportOverrideRow[],
	videosById: Map<string, SessionWorkoutVideoRow>
): Map<number, SessionWorkoutVideoRow[]> {
	if (overrides.length === 0) return baseDays;

	const days = new Map(baseDays);
	const resolve = (ids: string[]) =>
		ids.map((id) => videosById.get(id)).filter((v): v is SessionWorkoutVideoRow => v != null);

	for (const override of overrides) {
		const current = days.get(override.dayIndex) ?? [];
		if (override.kind === 'HIDE') {
			days.delete(override.dayIndex);
			continue;
		}
		const next =
			override.kind === 'REPLACE'
				? resolve(override.workoutVideoIds)
				: [...current, ...resolve(override.workoutVideoIds)];
		if (next.length === 0) days.delete(override.dayIndex);
		else days.set(override.dayIndex, orderVideos(next));
	}

	return new Map([...days.entries()].sort((a, b) => a[0] - b[0]));
}
