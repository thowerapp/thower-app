import type { ProgramGenStatus } from '@prisma/client';
import { prisma } from '$lib/server';
import { GENERATION_LEASE_MS } from './generationLock';
import { scheduleProgramGenerationAfterPayment } from './index';

/** Comptes repris par passage du cron : une génération dure ~2 s, la fonction est limitée à 60 s. */
export const CATCH_UP_BATCH = 5;

export type CatchUpCandidateRow = {
	id: string;
	nutritionDaysAllocated: number;
	programGenStatus: ProgramGenStatus | null;
	programGenStartedAt: Date | null;
};

/**
 * Comptes dont la génération est à reprendre : échec, `RUNNING` au-delà du bail (fonction coupée),
 * ou moins de jours générés que de jours alloués (paiement arrivé pendant une génération, renouvellement).
 * Une génération en cours dans son bail n'est jamais reprise.
 */
export function selectCatchUpCandidates(
	rows: CatchUpCandidateRow[],
	generatedDays: Map<string, number>,
	now: Date = new Date()
): string[] {
	return rows
		.filter((u) => {
			if (u.programGenStatus === 'RUNNING') {
				const startedAt = u.programGenStartedAt?.getTime() ?? 0;
				return now.getTime() - startedAt >= GENERATION_LEASE_MS;
			}
			if (u.programGenStatus === 'FAILED') return true;
			return (generatedDays.get(u.id) ?? 0) < u.nutritionDaysAllocated;
		})
		.map((u) => u.id);
}

/** Relance (au plus `limit`) les générations incomplètes des comptes à l'accès valide ayant des mensurations. */
export async function catchUpProgramGenerations(
	limit = CATCH_UP_BATCH,
	now: Date = new Date()
): Promise<{ candidates: number; processed: string[]; failed: string[] }> {
	const rows = await prisma.user.findMany({
		where: { nutritionDaysAllocated: { gt: 0 }, subscriptionEndsAt: { gt: now } },
		select: { id: true, nutritionDaysAllocated: true, programGenStatus: true, programGenStartedAt: true }
	});
	if (rows.length === 0) return { candidates: 0, processed: [], failed: [] };

	const ids = rows.map((r) => r.id);
	const [dayCounts, measured] = await Promise.all([
		prisma.nutritionDay.groupBy({ by: ['userId'], where: { userId: { in: ids } }, _count: { _all: true } }),
		prisma.bodyMeasurement.groupBy({ by: ['userId'], where: { userId: { in: ids } } })
	]);
	const withMeasurements = new Set(measured.map((m) => m.userId));
	const generatedDays = new Map(dayCounts.map((d) => [d.userId, d._count._all]));

	const candidates = selectCatchUpCandidates(
		rows.filter((r) => withMeasurements.has(r.id)),
		generatedDays,
		now
	);

	const processed: string[] = [];
	const failed: string[] = [];
	for (const userId of candidates.slice(0, limit)) {
		try {
			await scheduleProgramGenerationAfterPayment(userId, { source: 'internal' });
			processed.push(userId);
		} catch (err) {
			console.error('[catchUpProgramGenerations]', userId, err);
			failed.push(userId);
		}
	}
	return { candidates: candidates.length, processed, failed };
}
