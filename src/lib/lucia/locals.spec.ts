import { describe, expect, it } from 'vitest';
import type { Session as LuciaSession, User as LuciaUser } from 'lucia';
import { toLocalsAuth } from './locals';

const luciaUser = {
	id: 'u1',
	userId: 'u1',
	email: 'a@b.fr',
	username: null,
	role: 'CLIENT',
	isMfaEnabled: true,
	emailVerified: true,
	registered2FA: true,
	googleId: null,
	name: 'Ada',
	picture: null,
	subscriptionEndsAt: new Date('2027-01-01T00:00:00Z')
} as unknown as LuciaUser;

const luciaSession = {
	id: 's1',
	userId: 'u1',
	expiresAt: new Date('2026-12-01T00:00:00Z'),
	fresh: false,
	twoFactorVerified: true,
	oauthProvider: undefined
} as unknown as LuciaSession;

describe('toLocalsAuth', () => {
	it('projette l’utilisateur sans champs internes', () => {
		const { user } = toLocalsAuth(luciaUser, luciaSession);
		expect(user).toEqual({
			id: 'u1',
			email: 'a@b.fr',
			username: null,
			emailVerified: true,
			registered2FA: true,
			googleId: null,
			name: 'Ada',
			picture: null,
			role: 'CLIENT',
			isMfaEnabled: true,
			subscriptionEndsAt: new Date('2027-01-01T00:00:00Z')
		});
		expect(user).not.toHaveProperty('totpKey');
		expect(user).not.toHaveProperty('userId');
	});

	it('projette la session avec ses indicateurs 2FA et le flag fresh', () => {
		const { session } = toLocalsAuth(luciaUser, luciaSession);
		expect(session).toEqual({
			id: 's1',
			userId: 'u1',
			expiresAt: new Date('2026-12-01T00:00:00Z'),
			twoFactorVerified: true,
			oauthProvider: null,
			fresh: false
		});
	});
});
