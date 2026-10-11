import { prisma } from '$lib/server';
import type { DiscoveryCategory } from '@prisma/client';
import { notSeedVideo } from '$lib/prisma/video/seedVideo';

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
	const [allLinked, unlockedLinked, visibleTaskLinked, all] = await Promise.all([
		prisma.programDayItem.findMany({
			where: { discoveryContentId: { not: null } },
			select: { discoveryContentId: true },
			distinct: ['discoveryContentId']
		}),
		prisma.programDayItem.findMany({
			where: {
				discoveryContentId: { not: null },
				programDay: { dayIndex: { lte: currentDayIndex } }
			},
			select: { discoveryContentId: true },
			distinct: ['discoveryContentId']
		}),
		prisma.dailyTask.findMany({
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
		prisma.discoveryContent.findMany({
			where: { category, active: true, ...notSeedVideo },
			orderBy: { order: 'asc' },
			select: {
				id: true, title: true, order: true,
				durationSeconds: true, thumbnailUrl: true,
				cloudflareUid: true, status: true
			}
		})
	]);

	const programManagedIds = new Set<string>(
		allLinked.flatMap((r) => (r.discoveryContentId ? [r.discoveryContentId] : []))
	);
	const unlockedIds = new Set<string>(
		unlockedLinked.flatMap((r) => (r.discoveryContentId ? [r.discoveryContentId] : []))
	);
	const taskUnlockedIds = new Set<string>(
		visibleTaskLinked.flatMap((r) => (r.discoveryContentId ? [r.discoveryContentId] : []))
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
