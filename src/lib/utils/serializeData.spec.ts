import { describe, expect, it } from 'vitest';
import { serializeData } from './serializeData';

describe('serializeData', () => {
	it('convertit dates et octets en chaînes, et les valeurs absentes en null, jusque dans les imbrications', () => {
		const date = new Date('2026-10-12T10:00:00Z');
		const result = serializeData({
			date,
			octets: new Uint8Array([1, 2, 3]),
			tampon: Buffer.from('abc'),
			liste: [date, { a: undefined }],
			absent: undefined,
			nul: null,
			nombre: 3,
			texte: 'x'
		});
		expect(result).toEqual({
			date: '2026-10-12T10:00:00.000Z',
			octets: 'AQID',
			tampon: 'YWJj',
			liste: ['2026-10-12T10:00:00.000Z', { a: null }],
			absent: null,
			nul: null,
			nombre: 3,
			texte: 'x'
		});
	});

	it('laisse intactes les valeurs simples', () => {
		expect(serializeData(null)).toBeNull();
		expect(serializeData(5)).toBe(5);
		expect(serializeData('a')).toBe('a');
	});
});
