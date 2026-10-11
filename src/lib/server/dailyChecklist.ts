import { Prisma } from '@prisma/client';
import { prisma } from '$lib/server';
import { startOfUtcDay } from '$lib/utils/programDay';

export type ChecklistResult =
	| { ok: true; pointsEarned: number }
	| { ok: false; status: 400 | 409; message: string };

/**
 * Valide la checklist du jour : tâches STANDARD cochées + points, dans une seule transaction.
 * Les tâches VIDEO sont auto-complétées par le visionnage et n'entrent pas dans cette garde.
 */
export async function validateDailyChecklist(
	userId: string,
	rawTaskIds: string[],
	source: string
): Promise<ChecklistResult> {
	const todayStart = startOfUtcDay();
	// Les ids `__…` sont les tâches de repli affichées quand aucune tâche n'existe en base.
	const checkedIds = rawTaskIds.filter((id) => id.length > 0 && !id.startsWith('__'));
	if (checkedIds.length === 0) return { ok: false, status: 400, message: 'Aucune tâche sélectionnée.' };

	const tasks = await prisma.dailyTask.findMany({
		where: { id: { in: checkedIds }, active: true, type: 'STANDARD' },
		select: { id: true, points: true }
	});
	if (tasks.length === 0) return { ok: false, status: 400, message: 'Aucune tâche valide sélectionnée.' };

	const existing = await prisma.dailyTaskCompletion.count({
		where: { userId, date: todayStart, taskId: { in: tasks.map((t) => t.id) } }
	});
	if (existing > 0) return { ok: false, status: 409, message: "Checklist déjà validée pour aujourd'hui." };

	const pointsEarned = tasks.reduce((sum, t) => sum + t.points, 0);

	try {
		await prisma.$transaction([
			prisma.dailyTaskCompletion.createMany({
				data: tasks.map((t) => ({ userId, taskId: t.id, date: todayStart }))
			}),
			...(pointsEarned > 0
				? [
						prisma.pointEvent.create({
							data: {
								userId,
								type: 'DAILY_TASK',
								amount: pointsEarned,
								metadata: { source, date: todayStart.toISOString() }
							}
						})
					]
				: [])
		]);
	} catch (err) {
		// Double envoi simultané : l'index unique (user, tâche, date) refuse le second, sans points en double.
		if (
			err instanceof Prisma.PrismaClientKnownRequestError &&
			(err.code === 'P2002' || err.code === 'P2034')
		) {
			return { ok: false, status: 409, message: "Checklist déjà validée pour aujourd'hui." };
		}
		throw err;
	}

	return { ok: true, pointsEarned };
}
