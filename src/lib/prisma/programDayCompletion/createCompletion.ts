import { prisma } from '$lib/server';

export type CreateCompletionData = {
	userId: string;
	programDayItemId: string;
	stepsValue?: number | null;
};

export async function createProgramDayItemCompletion(data: CreateCompletionData) {
	const client = prisma as {
		userProgramDayItemCompletion?: {
			create: (args: { data: unknown }) => Promise<unknown>;
		};
	};
	if (!client?.userProgramDayItemCompletion) {
		throw new Error('Prisma client has no "userProgramDayItemCompletion" model. Run: npx prisma generate');
	}
	return client.userProgramDayItemCompletion.create({
		data: {
			userId: data.userId,
			programDayItemId: data.programDayItemId,
			stepsValue: data.stepsValue ?? undefined
		}
	});
}
