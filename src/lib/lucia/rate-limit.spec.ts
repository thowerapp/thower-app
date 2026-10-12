import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RefillingTokenBucket } from './rate-limit';

describe('RefillingTokenBucket', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
	});
	afterEach(() => vi.useRealTimers());

	it('refuse au-delà du plafond, puis rend un jeton par intervalle', () => {
		const bucket = new RefillingTokenBucket<string>(3, 1);
		expect([1, 2, 3, 4].map(() => bucket.consume('ip', 1))).toEqual([true, true, true, false]);
		vi.advanceTimersByTime(1000);
		expect(bucket.consume('ip', 1)).toBe(true);
		expect(bucket.consume('ip', 1)).toBe(false);
	});

	it('recharge même quand les appels arrivent plus souvent qu’un intervalle', () => {
		const bucket = new RefillingTokenBucket<string>(2, 1);
		bucket.consume('ip', 1);
		bucket.consume('ip', 1);
		expect(bucket.consume('ip', 1)).toBe(false);
		// Un appel toutes les 400 ms : au bout de 2 s, deux jetons doivent être revenus.
		let granted = 0;
		for (let i = 0; i < 5; i++) {
			vi.advanceTimersByTime(400);
			if (bucket.consume('ip', 1)) granted++;
		}
		expect(granted).toBe(2);
	});

	it('garde un seau par clé', () => {
		const bucket = new RefillingTokenBucket<string>(1, 60);
		expect(bucket.consume('a', 1)).toBe(true);
		expect(bucket.consume('a', 1)).toBe(false);
		expect(bucket.consume('b', 1)).toBe(true);
	});
});
