import { prisma } from '$lib/server';

export type CreateCompletionData = {
	userId: string;
	programDayItemId: string;
	stepsValue?: number | null;
};

export async function createProgramDayItemCompletion(data: CreateCompletionData) {
	return prisma.userProgramDayItemCompletion.create({
		data: {
			userId: data.userId,
			programDayItemId: data.programDayItemId,
			stepsValue: data.stepsValue ?? undefined
		}
	});
}
