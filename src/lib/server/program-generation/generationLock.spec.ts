import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
	user: { updateMany: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
	nutritionDay: { findFirst: vi.fn() }
};
vi.mock('$lib/server', () => ({ prisma: prismaMock }));

const {
	claimProgramGeneration,
	finishProgramGeneration,
	shouldResumeProgramGeneration,
	GENERATION_LEASE_MS
} = await import('./generationLock');

beforeEach(() => vi.clearAllMocks());

describe('claimProgramGeneration', () => {
	it('r\u00e9serve quand une seule ligne est mise \u00e0 jour', async () => {
		prismaMock.user.updateMany.mockResolvedValue({ count: 1 });
		await expect(claimProgramGeneration('u1')).resolves.toBe(true);
	});

	it('refuse quand une g\u00e9n\u00e9ration est d\u00e9j\u00e0 en cours', async () => {
		prismaMock.user.updateMany.mockResolvedValue({ count: 0 });
		await expect(claimProgramGeneration('u1')).resolves.toBe(false);
	});

	it('accepte les \u00e9tats absents, termin\u00e9s ou au bail expir\u00e9', async () => {
		prismaMock.user.updateMany.mockResolvedValue({ count: 1 });
		const now = new Date('2026-01-01T12:00:00Z');
		await claimProgramGeneration('u1', now);
		const { where, data } = prismaMock.user.updateMany.mock.calls[0][0];
		expect(where.OR).toContainEqual({ programGenStatus: { isSet: false } });
		expect(where.OR).toContainEqual({ programGenStatus: { in: ['IDLE', 'DONE', 'FAILED'] } });
		expect(where.OR).toContainEqual({
			programGenStatus: 'RUNNING',
			programGenStartedAt: { lt: new Date(now.getTime() - GENERATION_LEASE_MS) }
		});
		expect(data.programGenStatus).toBe('RUNNING');
	});
});

describe('finishProgramGeneration', () => {
	it('enregistre le r\u00e9sultat', async () => {
		await finishProgramGeneration('u1', 'FAILED');
		expect(prismaMock.user.update.mock.calls[0][0].data.programGenStatus).toBe('FAILED');
	});
});

describe('shouldResumeProgramGeneration', () => {
	const now = new Date('2026-01-01T12:00:00Z');
	const user = (programGenStatus: string | null, startedMsAgo?: number) =>
		prismaMock.user.findUnique.mockResolvedValue({
			programGenStatus,
			programGenStartedAt: startedMsAgo == null ? null : new Date(now.getTime() - startedMsAgo)
		});

	it.each(['FAILED', 'IDLE'])('reprend apr\u00e8s %s', async (status) => {
		user(status);
		await expect(shouldResumeProgramGeneration('u1', now)).resolves.toBe(true);
	});

	it('ne reprend pas une g\u00e9n\u00e9ration termin\u00e9e', async () => {
		user('DONE');
		await expect(shouldResumeProgramGeneration('u1', now)).resolves.toBe(false);
	});

	it('ne reprend RUNNING qu\u2019apr\u00e8s expiration du bail', async () => {
		user('RUNNING', 60_000);
		await expect(shouldResumeProgramGeneration('u1', now)).resolves.toBe(false);
		user('RUNNING', GENERATION_LEASE_MS + 1);
		await expect(shouldResumeProgramGeneration('u1', now)).resolves.toBe(true);
	});

	it('sans \u00e9tat : reprend seulement s\u2019il n\u2019y a aucun planning', async () => {
		user(null);
		prismaMock.nutritionDay.findFirst.mockResolvedValue(null);
		await expect(shouldResumeProgramGeneration('u1', now)).resolves.toBe(true);
		prismaMock.nutritionDay.findFirst.mockResolvedValue({ id: 'd1' });
		await expect(shouldResumeProgramGeneration('u1', now)).resolves.toBe(false);
	});
});
