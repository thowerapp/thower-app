import { describe, expect, it } from 'vitest';
import { computeThemeVars } from './theme';

const vars = (day: number) => Object.fromEntries(computeThemeVars(day).split(';').map((p) => p.split(/:(.*)/s).slice(0, 2)));

describe('computeThemeVars', () => {
	it('part de l’or au jour 1, passe par le blanc au milieu et finit en cyan au jour 91', () => {
		expect(vars(1)['--g']).toBe('#c9a84e');
		expect(vars(46)['--g']).toBe('#f0ede8');
		expect(vars(91)['--g']).toBe('#00e5ff');
	});

	it('borne les jours hors programme et décline la couleur en transparences', () => {
		expect(computeThemeVars(-10)).toBe(computeThemeVars(1));
		expect(computeThemeVars(500)).toBe(computeThemeVars(91));
		expect(vars(1)['--gg']).toBe('rgba(201,168,78,0.18)');
		expect(vars(1)['--gd']).toBe('rgba(201,168,78,0.55)');
		expect(vars(1)['--gb']).toBe(vars(1)['--g']);
	});
});
