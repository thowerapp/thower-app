import { describe, expect, it } from 'vitest';
import { catalogPickSeed, mulberry32 } from './seededRandom';

describe('catalogPickSeed', () => {
	it('est stable et dépend de chaque composante', () => {
		const base = catalogPickSeed('u1', 3, 'DAY', 0);
		expect(catalogPickSeed('u1', 3, 'DAY', 0)).toBe(base);
		expect(catalogPickSeed('u2', 3, 'DAY', 0)).not.toBe(base);
		expect(catalogPickSeed('u1', 4, 'DAY', 0)).not.toBe(base);
		expect(catalogPickSeed('u1', 3, 'BREAKFAST', 0)).not.toBe(base);
		expect(catalogPickSeed('u1', 3, 'DAY', 1)).not.toBe(base);
	});
});

describe('mulberry32', () => {
	it('rejoue la même suite pour une même graine, dans [0, 1)', () => {
		const a = mulberry32(42);
		const b = mulberry32(42);
		const values = Array.from({ length: 50 }, () => a());
		expect(values).toEqual(Array.from({ length: 50 }, () => b()));
		expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
	});

	it('diffère selon la graine', () => {
		expect(mulberry32(1)()).not.toBe(mulberry32(2)());
	});
});
