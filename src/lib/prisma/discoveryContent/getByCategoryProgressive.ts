import { prisma } from '$lib/server';
import type { DiscoveryCategory } from '@prisma/client';

/**
 * Retourne les vidéos de découverte accessibles pour l'utilisateur à son jour courant.
 *
 * Règle :
 *  - Une vidéo NON rattachée au programme (ni ProgramDayItem, ni DailyTask active)
 *    est toujours visible (libre).
 *  - Une vidéo rattachée au programme via ProgramDayItem est visible si au moins un
 *    de ses items a programDay.dayIndex <= currentDayIndex.
 *  - Une vidéo liée à une DailyTask active et visible (showFromDay/showUntilDay)
 *    est toujours débloquée, même si son ProgramDayItem pointe plus loin —
 *    cohérence avec la checklist qui affiche déjà cette vidéo à l'utilisateur.
 */
export async function getDiscoveryContentByCategoryProgressive(
	category: DiscoveryCategory,
	currentDayIndex: number
) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const db = prisma as any;
	if (!db?.discoveryContent) return [];

	// 1. IDs de toutes les vidéos rattachées au programme (géré par le calendrier)
	const allLinked: { discoveryContentId: string | null }[] =
		await db.programDayItem.findMany({
			where: { discoveryContentId: { not: null } },
			select: { discoveryContentId: true },
			distinct: ['discoveryContentId']
		});
	const programManagedIds = allLinked
		.map((r) => r.discoveryContentId)
		.filter((id): id is string => id != null);

	// 2. IDs débloqués via le calendrier (ProgramDayItem d'un jour déjà atteint)
	const unlockedLinked: { discoveryContentId: string | null }[] =
		await db.programDayItem.findMany({
			where: {
				discoveryContentId: { not: null },
				programDay: { dayIndex: { lte: currentDayIndex } }
			},
			select: { discoveryContentId: true },
			distinct: ['discoveryContentId']
		});
	const unlockedIds = unlockedLinked
		.map((r) => r.discoveryContentId)
		.filter((id): id is string => id != null);

	// 3. IDs débloqués via une DailyTask active et visible aujourd'hui.
	//    Jour 0 (attente du lundi) : aucun déblocage via tâche.
	const visibleTaskLinked: { discoveryContentId: string | null }[] =
		currentDayIndex < 1
			? []
			: await db.dailyTask.findMany({
					where: {
						active: true,
						discoveryContentId: { not: null },
						AND: [
							{ OR: [{ showFromDay: null }, { showFromDay: { lte: currentDayIndex } }] },
							{ OR: [{ showUntilDay: null }, { showUntilDay: { gte: currentDayIndex } }] }
						]
					},
					select: { discoveryContentId: true },
					distinct: ['discoveryContentId']
				});
	const taskUnlockedIds = visibleTaskLinked
		.map((r) => r.discoveryContentId)
		.filter((id): id is string => id != null);

	// IDs gérés par le programme mais pas encore débloqués via ProgramDayItem.
	// S'ils sont débloqués via DailyTask, ils doivent quand même apparaître.
	const programLockedIds = programManagedIds.filter((id) => !unlockedIds.includes(id));
	// Parmi les vidéos encore verrouillées par le calendrier, celles débloquées par DailyTask
	const taskUnlockedFromLocked = programLockedIds.filter((id) => taskUnlockedIds.includes(id));

	// 4. Vidéos visibles = libres (non gérées) OU débloquées calendrier OU débloquées DailyTask
	const allUnlockedIds = [...new Set([...unlockedIds, ...taskUnlockedFromLocked])];

	return db.discoveryContent.findMany({
		where: {
			category,
			active: true,
			OR: [
				{ id: { notIn: programManagedIds } },
				...(allUnlockedIds.length > 0 ? [{ id: { in: allUnlockedIds } }] : [])
			]
		},
		orderBy: { order: 'asc' }
	});
}
