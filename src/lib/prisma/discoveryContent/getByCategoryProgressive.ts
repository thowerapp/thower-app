import { prisma } from '$lib/server';
import type { DiscoveryCategory } from '@prisma/client';

/**
 * Retourne les vidéos de découverte accessibles pour l'utilisateur à son jour courant.
 *
 * Règle :
 *  - Une vidéo NON rattachée au programme est toujours visible (libre).
 *  - Une vidéo rattachée au programme est visible uniquement si au moins un
 *    de ses ProgramDayItem a programDay.dayIndex <= currentDayIndex.
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

	// 2. IDs débloqués : rattachés à un jour déjà atteint
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

	// 3. Vidéos visibles = libres (non gérées) OU débloquées par le calendrier
	return db.discoveryContent.findMany({
		where: {
			category,
			active: true,
			OR: [
				{ id: { notIn: programManagedIds } },
				{ id: { in: unlockedIds.length > 0 ? unlockedIds : ['__none__'] } }
			]
		},
		orderBy: { order: 'asc' }
	});
}
