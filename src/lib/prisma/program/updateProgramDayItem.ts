import { prisma } from '$lib/server';

export type UpdateProgramDayItemData = {
	order?: number;
	points?: number;
	label?: string | null;
	stepsThreshold?: number | null;
};

export async function updateProgramDayItem(itemId: string, data: UpdateProgramDayItemData) {
	const client = prisma as { programDayItem?: { update: (args: { where: { id: string }; data: unknown }) => Promise<unknown> } };
	if (!client?.programDayItem) {
		throw new Error('Prisma client has no "programDayItem" model. Run: npx prisma generate');
	}
	return client.programDayItem.update({
		where: { id: itemId },
		data: {
			order: data.order,
			points: data.points,
			label: data.label,
			stepsThreshold: data.stepsThreshold
		}
	});
}
