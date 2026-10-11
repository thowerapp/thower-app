import { prisma } from '$lib/server';
import { invalidateSportPlan } from '$lib/server/sport/sportPlanCache';

export type UpdateProgramDayItemData = {
	order?: number;
	points?: number;
	label?: string | null;
	stepsThreshold?: number | null;
};

export async function updateProgramDayItem(itemId: string, data: UpdateProgramDayItemData) {
	const updated = await prisma.programDayItem.update({
		where: { id: itemId },
		data: {
			order: data.order,
			points: data.points,
			label: data.label,
			stepsThreshold: data.stepsThreshold
		}
	});
	invalidateSportPlan();
	return updated;
}
