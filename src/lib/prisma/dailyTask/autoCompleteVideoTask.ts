import { prisma } from '$lib/server';

function startOfUtcDay(d: Date = new Date()): Date {
	const r = new Date(d);
	r.setUTCHours(0, 0, 0, 0);
	return r;
}

/**
 * Après qu'une vidéo de découverte a été regardée à 80 %+,
 * coche automatiquement la DailyTask VIDEO associée pour aujourd'hui
 * et attribue les points si ce n'est pas déjà fait.
 *
 * Retourne les points gagnés (0 si déjà cochée ou aucune tâche associée).
 */
export async function autoCompleteVideoTask(
	userId: string,
	discoveryContentId: string
): Promise<number> {
	const todayStart = startOfUtcDay();
	const task = await (prisma as any).dailyTask.findFirst({
		where: {
			type: 'VIDEO',
			active: true,
			discoveryContentId
		},
		select: { id: true, points: true }
	});

	if (!task) return 0;

	const alreadyDone = await prisma.dailyTaskCompletion.findFirst({
		where: { userId, taskId: task.id, date: todayStart }
	});

	if (alreadyDone) return 0;

	const points = task.points as number;

	await prisma.$transaction([
		prisma.dailyTaskCompletion.create({
			data: { userId, taskId: task.id, date: todayStart }
		}),
		...(points > 0
			? [
					prisma.pointEvent.create({
						data: {
							userId,
							type: 'VIDEO_WATCHED',
							amount: points,
							metadata: { discoveryContentId, source: 'daily-task-video' }
						}
					})
				]
			: [])
	]);

	return points;
}
