import { prisma } from '$lib/server';

export type ProgramDayItemForVideo = {
	programDayItemId: string;
	dayIndex: number;
	type: string;
	points: number;
	label: string | null;
};

/**
 * Liste tous les `ProgramDayItem` rattachés à une vidéo donnée :
 * - Discovery : items dont `discoveryContentId === videoId`
 * - Workout   : items dont `workoutVideoId === videoId`
 *
 * Les items sont triés par `dayIndex` croissant pour faciliter l'affichage.
 */
export async function listProgramDayItemsForVideo(
	kind: 'workout' | 'discovery',
	videoId: string
): Promise<ProgramDayItemForVideo[]> {
	let where: Record<string, unknown>;
	if (kind === 'discovery') {
		where = { discoveryContentId: videoId };
	} else {
		where = { workoutVideoId: videoId };
	}

	const rows = await prisma.programDayItem.findMany({
		where,
		select: {
			id: true,
			type: true,
			points: true,
			label: true,
			programDay: { select: { dayIndex: true } }
		}
	});

	return rows
		.map((r: { id: string; type: string; points: number; label: string | null; programDay: { dayIndex: number } }) => ({
			programDayItemId: r.id,
			dayIndex: r.programDay.dayIndex,
			type: r.type,
			points: r.points ?? 0,
			label: r.label ?? null
		}))
		.sort((a: ProgramDayItemForVideo, b: ProgramDayItemForVideo) => a.dayIndex - b.dayIndex);
}
