import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server', () => ({ prisma: {} }));
vi.mock('./index', () => ({ scheduleProgramGenerationAfterPayment: vi.fn() }));

const { selectCatchUpCandidates } = await import('./catchUpGenerations');
const { GENERATION_LEASE_MS } = await import('./generationLock');

const now = new Date('2026-05-01T08:00:00.000Z');
const row = (id: string, over: Partial<Parameters<typeof selectCatchUpCandidates>[0][number]> = {}) => ({
	id,
	nutritionDaysAllocated: 91,
	programGenStatus: 'DONE' as const,
	programGenStartedAt: null,
	...over
});

describe('selectCatchUpCandidates', () => {
	it('reprend les échecs et les jours manquants, pas les plannings complets', () => {
		const rows = [
			row('complet'),
			row('echec', { programGenStatus: 'FAILED' }),
			row('renouvele', { nutritionDaysAllocated: 182 }),
			row('jamais', { programGenStatus: null })
		];
		const days = new Map([
			['complet', 91],
			['echec', 91],
			['renouvele', 91]
		]);
		expect(selectCatchUpCandidates(rows, days, now)).toEqual(['echec', 'renouvele', 'jamais']);
	});

	it('ne reprend une génération en cours qu’après expiration du bail', () => {
		const recent = new Date(now.getTime() - 60_000);
		const expired = new Date(now.getTime() - GENERATION_LEASE_MS - 1);
		const rows = [
			row('en-cours', { programGenStatus: 'RUNNING', programGenStartedAt: recent }),
			row('coupee', { programGenStatus: 'RUNNING', programGenStartedAt: expired })
		];
		expect(selectCatchUpCandidates(rows, new Map(), now)).toEqual(['coupee']);
	});
});
