import { prisma } from '$lib/server';
import type { DiscoveryCategory } from '@prisma/client';

export type DiscoveryItemWithLock = {
	id: string;
	title: string;
	order: number;
	durationSeconds: number | null;
	thumbnailUrl: string | null;
	cloudflareUid: string;
	status: string;
	locked: boolean;
	completed: boolean;
};

/**
 * Retourne tout le contenu actif d'une catégorie avec un flag `locked`.
 * Utilise la même logique de déblocage que getByCategoryProgressive,
 * mais inclut aussi les vidéos verrouillées (pour affichage en grille grisée).
 */
export async function getAllDiscoveryWithLockState(
	category: DiscoveryCategory,
	currentDayIndex: number,
	completedIds: Set<string>
): Promise<DiscoveryItemWithLock[]> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const db = prisma as any;
	if (!db?.discoveryContent) return [];

	const [allLinked, unlockedLinked, visibleTaskLinked, all] = await Promise.all([
		db.programDayItem.findMany({
			where: { discoveryContentId: { not: null } },
			select: { discoveryContentId: true },
			distinct: ['discoveryContentId']
		}),
		db.programDayItem.findMany({
			where: {
				discoveryContentId: { not: null },
				programDay: { dayIndex: { lte: currentDayIndex } }
			},
			select: { discoveryContentId: true },
			distinct: ['discoveryContentId']
		}),
		db.dailyTask.findMany({
			where: {
				active: true,
				discoveryContentId: { not: null },
				AND: [
					{ OR: [{ showFromDay: null }, { showFromDay: { lte: Math.max(currentDayIndex, 1) } }] },
					{ OR: [{ showUntilDay: null }, { showUntilDay: { gte: Math.max(currentDayIndex, 1) } }] }
				]
			},
			select: { discoveryContentId: true },
			distinct: ['discoveryContentId']
		}),
		db.discoveryContent.findMany({
			where: { category, active: true },
			orderBy: { order: 'asc' },
			select: {
				id: true, title: true, order: true,
				durationSeconds: true, thumbnailUrl: true,
				cloudflareUid: true, status: true
			}
		})
	]);

	const programManagedIds = new Set<string>(
		allLinked.map((r: { discoveryContentId: string }) => r.discoveryContentId).filter(Boolean)
	);
	const unlockedIds = new Set<string>(
		unlockedLinked.map((r: { discoveryContentId: string }) => r.discoveryContentId).filter(Boolean)
	);
	const taskUnlockedIds = new Set<string>(
		visibleTaskLinked.map((r: { discoveryContentId: string }) => r.discoveryContentId).filter(Boolean)
	);

	return all.map((v: { id: string; title: string; order: number; durationSeconds: number | null; thumbnailUrl: string | null; cloudflareUid: string; status: string }) => {
		const managedByProgram = programManagedIds.has(v.id);
		const unlockedByProgram = unlockedIds.has(v.id);
		const unlockedByTask = taskUnlockedIds.has(v.id);
		const locked = managedByProgram && !unlockedByProgram && !unlockedByTask;
		return {
			...v,
			locked,
			completed: completedIds.has(v.id)
		};
	});
}
