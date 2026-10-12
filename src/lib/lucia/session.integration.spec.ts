import type { RequestEvent } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import { prisma } from '$lib/server';
import { createPaidUser } from '$lib/server/testing/integration/db';
import {
	createSession,
	deleteSessionTokenCookie,
	generateSessionToken,
	invalidateSession,
	invalidateUserSessions,
	setSessionAs2FAVerified,
	setSessionTokenCookie
} from './session';

describe('sessions (base réelle)', () => {
	it('crée une session valable 30 jours, avec ou sans fournisseur OAuth', async () => {
		const user = await createPaidUser();
		const token = generateSessionToken();
		const session = await createSession(token, user.id, { twoFactorVerified: false });
		expect(session).toMatchObject({ id: token, userId: user.id, twoFactorVerified: false, oauthProvider: null });
		const days = (session.expiresAt.getTime() - Date.now()) / 86_400_000;
		expect(days).toBeGreaterThan(29.9);
		expect(days).toBeLessThanOrEqual(30);

		const google = await createSession(generateSessionToken(), user.id, { twoFactorVerified: true }, 'google');
		expect(google).toMatchObject({ oauthProvider: 'google', twoFactorVerified: true });
	});

	it('refuse un identifiant invalide et signale un échec d’écriture', async () => {
		await expect(createSession(generateSessionToken(), 'pas-un-id', { twoFactorVerified: false })).rejects.toThrow('Invalid user ID format');
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const user = await createPaidUser();
		const token = generateSessionToken();
		await createSession(token, user.id, { twoFactorVerified: false });
		await expect(createSession(token, user.id, { twoFactorVerified: false })).rejects.toThrow('Erreur lors de la création de la session');
		error.mockRestore();
	});

	it('valide la 2FA d’une session, puis invalide une session ou toutes celles d’un compte', async () => {
		const user = await createPaidUser();
		const [a, b] = [generateSessionToken(), generateSessionToken()];
		await createSession(a, user.id, { twoFactorVerified: false });
		await createSession(b, user.id, { twoFactorVerified: false });

		await setSessionAs2FAVerified(a);
		expect((await prisma.session.findUniqueOrThrow({ where: { id: a } })).twoFactorVerified).toBe(true);

		await invalidateSession(a);
		expect(await prisma.session.count({ where: { userId: user.id } })).toBe(1);
		await invalidateUserSessions(user.id);
		expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
		await expect(invalidateUserSessions('pas-un-id')).rejects.toThrow('Invalid user ID format');
	});

	it('ne fait pas échouer l’invalidation d’une session inconnue', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		await expect(invalidateSession('000000000000000000000000')).resolves.toBeUndefined();
		warn.mockRestore();
	});
});

describe('cookie de session', () => {
	it('pose un cookie httpOnly valable jusqu’à l’expiration, puis le supprime', () => {
		const set = vi.fn();
		const event = { cookies: { set } } as unknown as RequestEvent;
		const expiresAt = new Date(Date.now() + 1000);
		setSessionTokenCookie(event, 'jeton', expiresAt);
		deleteSessionTokenCookie(event);
		expect(set).toHaveBeenNthCalledWith(1, expect.any(String), 'jeton', expect.objectContaining({ httpOnly: true, path: '/', sameSite: 'lax', expires: expiresAt }));
		expect(set).toHaveBeenNthCalledWith(2, expect.any(String), '', expect.objectContaining({ httpOnly: true, maxAge: -1 }));
	});
});
