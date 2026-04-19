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
 * - Workout   : items dont la `WorkoutSession` contient cette `WorkoutVideo`
 *
 * Les items sont triés par `dayIndex` croissant pour faciliter l'affichage.
 */
export async function listProgramDayItemsForVideo(
	kind: 'workout' | 'discovery',
	videoId: string
): Promise<ProgramDayItemForVideo[]> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const db = prisma as any;
	if (!db?.programDayItem) {
		throw new Error('Prisma client has no "programDayItem" model. Run: npx prisma generate');
	}

	let where: Record<string, unknown>;
	if (kind === 'discovery') {
		where = { discoveryContentId: videoId };
	} else {
		// Pour un workout : on cherche les items qui pointent vers la WorkoutSession
		// dont la WorkoutVideo a cet id. La relation WorkoutSession.videos est
		// une back-relation Prisma utilisable via `some`.
		where = { workoutSession: { videos: { some: { id: videoId } } } };
	}

	const rows = await db.programDayItem.findMany({
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
