import { describe, expect, it } from 'vitest';
import { isAuthorizedCron } from './cronAuth';

describe('isAuthorizedCron', () => {
	it('accepte le bon secret', () => {
		expect(isAuthorizedCron('Bearer s3cret', 's3cret', false)).toBe(true);
	});

	it('refuse un mauvais secret, un en-tête absent ou mal formé', () => {
		expect(isAuthorizedCron('Bearer autre', 's3cret', false)).toBe(false);
		expect(isAuthorizedCron('Bearer s3cret-et-plus', 's3cret', false)).toBe(false);
		expect(isAuthorizedCron(null, 's3cret', true)).toBe(false);
		expect(isAuthorizedCron('s3cret', 's3cret', true)).toBe(false);
	});

	it('sans secret configuré : refuse en production, accepte en développement', () => {
		expect(isAuthorizedCron(null, undefined, false)).toBe(false);
		expect(isAuthorizedCron('Bearer x', '', false)).toBe(false);
		expect(isAuthorizedCron(null, undefined, true)).toBe(true);
	});
});
