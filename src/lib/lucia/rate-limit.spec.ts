import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExpiringTokenBucket, RefillingTokenBucket, Throttler, TokenBucket } from './rate-limit';

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

describe('RefillingTokenBucket : vérification sans consommer', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
	});
	afterEach(() => vi.useRealTimers());

	it('accepte une clé inconnue, refuse un seau vide, et anticipe les jetons rendus', () => {
		const bucket = new RefillingTokenBucket<string>(2, 10);
		expect(bucket.check('k', 1)).toBe(true);
		bucket.consume('k', 1);
		bucket.consume('k', 1);
		expect(bucket.check('k', 1)).toBe(false);
		vi.advanceTimersByTime(10_000);
		expect(bucket.check('k', 1)).toBe(true);
		expect(bucket.check('k', 2)).toBe(false);
	});
});

describe('ExpiringTokenBucket', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
	});
	afterEach(() => vi.useRealTimers());

	it('refuse au-delà du plafond jusqu’à l’expiration, puis repart de zéro', () => {
		const bucket = new ExpiringTokenBucket<string>(2, 60);
		expect(bucket.check('k', 1)).toBe(true);
		expect([1, 2, 3].map(() => bucket.consume('k', 1))).toEqual([true, true, false]);
		expect(bucket.check('k', 1)).toBe(false);
		vi.advanceTimersByTime(59_000);
		expect(bucket.consume('k', 1)).toBe(false);
		vi.advanceTimersByTime(1_000);
		expect(bucket.check('k', 1)).toBe(true);
		expect(bucket.consume('k', 1)).toBe(true);
	});

	it('se vide avec reset', () => {
		const bucket = new ExpiringTokenBucket<string>(1, 60);
		bucket.consume('k', 1);
		expect(bucket.consume('k', 1)).toBe(false);
		bucket.reset('k');
		expect(bucket.consume('k', 1)).toBe(true);
	});
});

describe('TokenBucket', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
	});
	afterEach(() => vi.useRealTimers());

	it('rend les jetons au fil du temps, sans dépasser le plafond', () => {
		const bucket = new TokenBucket<string>(2, 5);
		expect(bucket.check('k', 1)).toBe(true);
		expect([1, 2, 3].map(() => bucket.consume('k', 1))).toEqual([true, true, false]);
		expect(bucket.check('k', 1)).toBe(false);
		vi.advanceTimersByTime(5_000);
		expect(bucket.check('k', 1)).toBe(true);
		expect(bucket.consume('k', 1)).toBe(true);
		vi.advanceTimersByTime(60_000);
		expect([1, 2, 3].map(() => bucket.consume('k', 1))).toEqual([true, true, false]);
	});
});

describe('Throttler', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
	});
	afterEach(() => vi.useRealTimers());

	it('impose une attente de plus en plus longue, plafonnée à la dernière valeur, jusqu’à la remise à zéro', () => {
		const throttler = new Throttler<string>([0, 1, 2]);
		expect(throttler.consume('u')).toBe(true);
		expect(throttler.consume('u')).toBe(true);
		expect(throttler.consume('u')).toBe(false);
		vi.advanceTimersByTime(1_000);
		expect(throttler.consume('u')).toBe(true);
		expect(throttler.consume('u')).toBe(false);
		vi.advanceTimersByTime(2_000);
		expect(throttler.consume('u')).toBe(true);
		vi.advanceTimersByTime(2_000);
		expect(throttler.consume('u')).toBe(true);
		throttler.reset('u');
		expect(throttler.consume('u')).toBe(true);
		expect(throttler.consume('u')).toBe(true);
	});
});
