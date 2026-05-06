import { prisma } from '$lib/server';
import type { ProgramDayItemType } from '@prisma/client';

export type CreateProgramDayItemData = {
	programDayId: string;
	type: ProgramDayItemType;
	order?: number;
	points?: number;
	label?: string | null;
	stepsThreshold?: number | null;
	dailyTaskId?: string | null;
	discoveryContentId?: string | null;
	workoutVideoId?: string | null;
};

export async function createProgramDayItem(data: CreateProgramDayItemData) {
	const client = prisma as { programDayItem?: { create: (args: { data: unknown }) => Promise<unknown> } };
	if (!client?.programDayItem) {
		throw new Error('Prisma client has no "programDayItem" model. Run: npx prisma generate');
	}
	return client.programDayItem.create({
		data: {
			programDayId: data.programDayId,
			type: data.type,
			order: data.order ?? 0,
			points: data.points ?? 0,
			label: data.label ?? undefined,
			stepsThreshold: data.stepsThreshold ?? undefined,
			dailyTaskId: data.dailyTaskId ?? undefined,
			discoveryContentId: data.discoveryContentId ?? undefined,
			workoutVideoId: data.workoutVideoId ?? undefined
		}
	});
}
