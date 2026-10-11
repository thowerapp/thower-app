import { prisma } from '$lib/server';
import { invalidateSportPlan } from '$lib/server/sport/sportPlanCache';
import type { ProgramDayItemType } from '@prisma/client';

export type AttachVideoToDayInput = {
	kind: 'workout' | 'discovery';
	/** Id Prisma de la WorkoutVideo (kind=workout) ou de la DiscoveryContent (kind=discovery). */
	videoId: string;
	/** 1..91 */
	dayIndex: number;
	type: ProgramDayItemType;
	points: number;
	label?: string | null;
};

export type AttachVideoToDayResult = {
	programDayItemId: string;
	created: boolean;
	dayIndex: number;
};

/**
 * Rattache une vidéo à un jour du programme actif.
 *
 * - Récupère (ou crée) le `ProgramDay { dayIndex }` du `Program { active: true }`.
 * - Pour `kind=workout` : insère un `ProgramDayItem` rattaché directement à la `WorkoutVideo`.
 * - Pour `kind=discovery` : insère un `ProgramDayItem` rattaché à la `DiscoveryContent`.
 *
 * Idempotent : si un item identique existe déjà sur ce jour pour cette vidéo,
 * il est renvoyé tel quel avec `created=false` (pas de doublon).
 */
export async function attachVideoToDay(
	input: AttachVideoToDayInput
): Promise<AttachVideoToDayResult> {
	if (!Number.isInteger(input.dayIndex) || input.dayIndex < 1 || input.dayIndex > 91) {
		throw new Error('dayIndex doit être un entier entre 1 et 91.');
	}

	let program = await prisma.program.findFirst({ where: { active: true }, select: { id: true } });
	if (!program) {
		program = await prisma.program.create({ data: {}, select: { id: true } });
	}

	let programDay = await prisma.programDay.findFirst({
		where: { programId: program.id, dayIndex: input.dayIndex },
		select: { id: true }
	});
	if (!programDay) {
		programDay = await prisma.programDay.create({
			data: { programId: program.id, dayIndex: input.dayIndex },
			select: { id: true }
		});
	}

	const dedupWhere =
		input.kind === 'discovery'
			? { programDayId: programDay.id, discoveryContentId: input.videoId }
			: { programDayId: programDay.id, workoutVideoId: input.videoId };

	const existing = await prisma.programDayItem.findFirst({
		where: dedupWhere,
		select: { id: true }
	});
	if (existing) {
		return { programDayItemId: existing.id, created: false, dayIndex: input.dayIndex };
	}

	const created = await prisma.programDayItem.create({
		data: {
			programDayId: programDay.id,
			type: input.type,
			points: input.points,
			label: input.label ?? undefined,
			discoveryContentId: input.kind === 'discovery' ? input.videoId : undefined,
			workoutVideoId: input.kind === 'workout' ? input.videoId : undefined
		},
		select: { id: true }
	});
	invalidateSportPlan();

	return { programDayItemId: created.id, created: true, dayIndex: input.dayIndex };
}
