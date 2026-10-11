import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cachedSportPlan, invalidateSportPlan } from './sportPlanCache';

describe('cachedSportPlan', () => {
	beforeEach(() => {
		invalidateSportPlan();
		vi.useRealTimers();
	});

	it('ne charge qu\u2019une fois pour des appels concurrents ou successifs', async () => {
		const load = vi.fn(async () => ({ n: 1 }));
		const [a, b] = await Promise.all([cachedSportPlan(load), cachedSportPlan(load)]);
		await cachedSportPlan(load);
		expect(load).toHaveBeenCalledTimes(1);
		expect(a).toBe(b);
	});

	it('recharge apr\u00e8s invalidation', async () => {
		const load = vi.fn(async () => ({}));
		await cachedSportPlan(load);
		invalidateSportPlan();
		await cachedSportPlan(load);
		expect(load).toHaveBeenCalledTimes(2);
	});

	it('recharge apr\u00e8s expiration du TTL', async () => {
		vi.useFakeTimers();
		const load = vi.fn(async () => ({}));
		await cachedSportPlan(load);
		vi.advanceTimersByTime(61_000);
		await cachedSportPlan(load);
		expect(load).toHaveBeenCalledTimes(2);
	});

	it('ne garde pas un chargement en erreur', async () => {
		const failing = vi.fn(async () => {
			throw new Error('db');
		});
		await expect(cachedSportPlan(failing)).rejects.toThrow('db');
		const ok = vi.fn(async () => 'ok');
		await expect(cachedSportPlan(ok)).resolves.toBe('ok');
		expect(ok).toHaveBeenCalledTimes(1);
	});

	it('une invalidation pendant le chargement n\u2019emp\u00eache pas un nouveau chargement', async () => {
		let release!: () => void;
		const slow = vi.fn(
			() => new Promise<string>((resolve) => (release = () => resolve('old')))
		);
		const first = cachedSportPlan(slow);
		invalidateSportPlan();
		const fresh = vi.fn(async () => 'new');
		await expect(cachedSportPlan(fresh)).resolves.toBe('new');
		release();
		await expect(first).resolves.toBe('old');
		expect(fresh).toHaveBeenCalledTimes(1);
	});
});
