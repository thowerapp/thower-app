import { describe, expect, it } from 'vitest';
import { formatDate } from './formatDate';

describe('formatDate', () => {
	it('formate en heure locale « HHh MMmin SSsec JJ/MM/AAAA » avec des zéros de remplissage', () => {
		const local = new Date(2025, 0, 9, 7, 5, 3);
		expect(formatDate(local.toISOString())).toBe('07h 05min 03sec 09/01/2025');
	});
});
