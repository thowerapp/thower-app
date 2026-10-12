import { createHash } from 'node:crypto';
import type { RequestEvent } from '@sveltejs/kit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '$lib/server';
import { createPaidUser } from '$lib/server/testing/integration/db';
import { decrypt, decryptToString, encrypt, encryptString } from './encryption';
import { hashPassword, verifyPasswordHash, verifyPasswordStrength } from './password';
import {
	createPasswordResetSession,
	deletePasswordResetSessionTokenCookie,
	sendPasswordResetEmail,
	setPasswordResetSessionTokenCookie,
	validatePasswordResetSessionRequest,
	validatePasswordResetSessionToken
} from './passwordReset';
import {
	createEmailVerificationRequest,
	deleteEmailVerificationRequestCookie,
	getUserEmailVerificationRequest,
	getUserEmailVerificationRequestFromRequest,
	sendVerificationEmail,
	setEmailVerificationRequestCookie
} from './email-verification';
import {
	createUser,
	getUserFromEmail,
	getUserFromGoogleId,
	getUserPasswordHash,
	getUserRecoverCode,
	getUserTOTPKey,
	resetUserRecoveryCode,
	setUserAsEmailVerifiedIfEmailMatches,
	updateUserEmailAndSetEmailAsVerified,
	updateUserPassword,
	updateUserTOTPKey
} from './user';

const UNKNOWN_ID = '000000000000000000000000';

function eventWith(options: { cookie?: string; user?: { id: string } | null } = {}) {
	const set = vi.fn();
	const event = {
		cookies: { get: vi.fn(() => options.cookie), set },
		locals: { user: options.user === undefined ? null : options.user }
	} as unknown as RequestEvent;
	return { event, set };
}

describe('chiffrement', () => {
	it('chiffre et déchiffre des octets, une chaîne ou du Base64', () => {
		const data = new Uint8Array([1, 2, 3, 250]);
		const encrypted = encrypt(data);
		expect(encrypted.byteLength).toBe(16 + data.byteLength + 16);
		expect([...decrypt(encrypted)]).toEqual([...data]);
		expect(decryptToString(encryptString('bonjour é'))).toBe('bonjour é');
		expect(
			Buffer.from(decrypt(Buffer.from(encryptString('abc')).toString('base64'))).toString()
		).toBe('abc');
	});

	it('refuse un Base64 invalide, des données trop courtes ou altérées', () => {
		expect(() => decrypt('pas du base64 !')).toThrow('Invalid Base64 string');
		expect(() => decrypt('AAAAA')).toThrow(/décodage Base64/);
		expect(() => decrypt(new Uint8Array(31))).toThrow('Insufficient length');
		const tampered = Buffer.from(encryptString('secret'));
		tampered[16] ^= 0xff;
		expect(() => decrypt(tampered)).toThrow(/déchiffrement/);
	});
});

describe('mot de passe', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('hache en argon2id et vérifie le mot de passe', async () => {
		const hash = await hashPassword('un-mot-de-passe-solide');
		expect(hash).toMatch(/^\$argon2id\$/);
		expect(await verifyPasswordHash(hash, 'un-mot-de-passe-solide')).toBe(true);
		expect(await verifyPasswordHash(hash, 'autre')).toBe(false);
	});

	it('refuse un mot de passe trop court ou trop long sans interroger le service', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		expect(await verifyPasswordStrength('court')).toBe(false);
		expect(await verifyPasswordStrength('x'.repeat(256))).toBe(false);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('refuse un mot de passe présent dans les fuites connues, accepte les autres', async () => {
		const sha1 = (value: string) => createHash('sha1').update(value).digest('hex').toUpperCase();
		const leaked = 'Motdepasse-fuite-1';
		const suffix = sha1(leaked).slice(5);
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(`0018A45C4D1DEF81644B54AB7F969B88D65:3\n${suffix}:42`))
		);
		expect(await verifyPasswordStrength(leaked)).toBe(false);
		expect(await verifyPasswordStrength('Motdepasse-inedit-2')).toBe(true);
	});
});

describe('comptes (base réelle)', () => {
	it('crée un compte avec mot de passe haché et code de récupération chiffré, puis le retrouve', async () => {
		const created = await createUser('Nouveau@Test.local', 'Nouveau', 'un-mot-de-passe-solide');
		expect(created).toMatchObject({
			email: 'Nouveau@Test.local',
			username: 'Nouveau',
			emailVerified: false,
			registered2FA: false,
			role: 'CLIENT'
		});

		expect((await getUserFromEmail('Nouveau@Test.local'))?.id).toBe(created.id);
		expect(await getUserFromEmail('inconnu@test.local')).toBeNull();
		expect(
			await verifyPasswordHash((await getUserPasswordHash(created.id))!, 'un-mot-de-passe-solide')
		).toBe(true);
		expect(await getUserPasswordHash(undefined, 'Nouveau@Test.local')).toBeTruthy();
		await expect(getUserPasswordHash()).rejects.toThrow('Missing user identifier');
		await expect(getUserPasswordHash(UNKNOWN_ID)).rejects.toThrow('User not found.');
	});

	it('retrouve un compte Google', async () => {
		const google = await prisma.user.create({
			data: { email: 'g@test.local', googleId: 'google-1', emailVerified: true }
		});
		expect((await getUserFromGoogleId('google-1'))?.id).toBe(google.id);
		expect(await getUserFromGoogleId('inconnu')).toBeNull();
		await expect(getUserRecoverCode(google.id)).rejects.toThrow('Recovery code not available');
		await expect(getUserRecoverCode(UNKNOWN_ID)).rejects.toThrow('Recovery code not available');
	});

	it('met à jour le mot de passe, l’email, la vérification et le code de récupération', async () => {
		const user = await createPaidUser();
		await updateUserPassword(user.id, 'nouveau-mot-de-passe-1');
		expect(
			await verifyPasswordHash((await getUserPasswordHash(user.id))!, 'nouveau-mot-de-passe-1')
		).toBe(true);

		await updateUserEmailAndSetEmailAsVerified(user.id, 'nouvelle@test.local');
		expect(await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).toMatchObject({
			email: 'nouvelle@test.local',
			emailVerified: true
		});

		await prisma.user.update({ where: { id: user.id }, data: { emailVerified: false } });
		expect(await setUserAsEmailVerifiedIfEmailMatches(user.id, 'autre@test.local')).toBe(false);
		expect(await setUserAsEmailVerifiedIfEmailMatches(user.id, 'nouvelle@test.local')).toBe(true);

		const code = await resetUserRecoveryCode(user.id);
		expect(await getUserRecoverCode(user.id)).toBe(code);
		await expect(updateUserPassword('pas-un-id', 'x')).rejects.toThrow('Invalid user ID format');
		await expect(updateUserEmailAndSetEmailAsVerified('pas-un-id', 'x@test.local')).rejects.toThrow(
			'Invalid user ID format'
		);
		await expect(setUserAsEmailVerifiedIfEmailMatches('pas-un-id', 'x@test.local')).rejects.toThrow(
			'Invalid user ID format'
		);
		await expect(resetUserRecoveryCode('pas-un-id')).rejects.toThrow('Invalid user ID format');
	});

	it('enregistre la clé TOTP chiffrée et la restitue', async () => {
		const user = await createPaidUser();
		expect(await getUserTOTPKey(user.id)).toBeNull();
		const key = new Uint8Array(20).map((_, i) => i + 1);
		await updateUserTOTPKey(user.id, key);
		expect([...(await getUserTOTPKey(user.id))!]).toEqual([...key]);
		expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).isMfaEnabled).toBe(
			true
		);
		expect((await getUserFromEmail(user.email))?.registered2FA).toBe(true);
	});
});

describe('session de réinitialisation du mot de passe (base réelle)', () => {
	it('crée une session de 10 minutes puis la valide avec son utilisateur', async () => {
		const user = await createPaidUser();
		const session = await createPasswordResetSession(user.id, user.email);
		expect(session).toMatchObject({
			userId: user.id,
			email: user.email,
			emailVerified: false,
			twoFactorVerified: false
		});
		expect(session.code).toHaveLength(8);
		const minutes = (session.expiresAt.getTime() - Date.now()) / 60_000;
		expect(minutes).toBeGreaterThan(9.9);
		expect(minutes).toBeLessThanOrEqual(10);

		const valid = await validatePasswordResetSessionToken(session.id);
		expect(valid.session).toMatchObject({ id: session.id, code: session.code });
		expect(valid.user).toMatchObject({ id: user.id, email: user.email, registered2FA: false });
	});

	it('rejette et supprime une session expirée, refuse un jeton mal formé', async () => {
		const user = await createPaidUser();
		const session = await createPasswordResetSession(user.id, user.email);
		await prisma.passwordResetSession.update({
			where: { id: session.id },
			data: { expiresAt: new Date(Date.now() - 1000) }
		});
		expect(await validatePasswordResetSessionToken(session.id)).toEqual({
			session: null,
			user: null
		});
		expect(await prisma.passwordResetSession.count()).toBe(0);
		await expect(validatePasswordResetSessionToken('pas-un-id')).rejects.toThrow(
			'Invalid session token format'
		);
	});

	it('ne plante pas sur un jeton valide mais inconnu', async () => {
		expect(await validatePasswordResetSessionToken(UNKNOWN_ID)).toEqual({
			session: null,
			user: null
		});
	});

	it('lit la session depuis le cookie et supprime le cookie d’une session invalide', async () => {
		const user = await createPaidUser();
		const session = await createPasswordResetSession(user.id, user.email);

		const none = eventWith();
		expect(await validatePasswordResetSessionRequest(none.event)).toEqual({
			session: null,
			user: null
		});
		const malformed = eventWith({ cookie: 'pas-un-id' });
		expect(await validatePasswordResetSessionRequest(malformed.event)).toEqual({
			session: null,
			user: null
		});

		const good = eventWith({ cookie: session.id });
		expect((await validatePasswordResetSessionRequest(good.event)).session?.id).toBe(session.id);
		expect(good.set).not.toHaveBeenCalled();

		await prisma.passwordResetSession.update({
			where: { id: session.id },
			data: { expiresAt: new Date(Date.now() - 1000) }
		});
		const expired = eventWith({ cookie: session.id });
		expect((await validatePasswordResetSessionRequest(expired.event)).session).toBeNull();
		expect(expired.set).toHaveBeenCalledWith(
			'password_reset_session',
			'',
			expect.objectContaining({ maxAge: 0 })
		);
	});

	it('pose et supprime le cookie', () => {
		const { event, set } = eventWith();
		const expiresAt = new Date(Date.now() + 1000);
		setPasswordResetSessionTokenCookie(event, 'jeton', expiresAt);
		deletePasswordResetSessionTokenCookie(event);
		expect(set).toHaveBeenNthCalledWith(
			1,
			'password_reset_session',
			'jeton',
			expect.objectContaining({ httpOnly: true, expires: expiresAt })
		);
		expect(set).toHaveBeenNthCalledWith(
			2,
			'password_reset_session',
			'',
			expect.objectContaining({ maxAge: 0 })
		);
	});
});

describe('vérification de l’email (base réelle)', () => {
	it('crée une demande de 10 minutes en remplaçant la précédente', async () => {
		const user = await createPaidUser();
		const first = await createEmailVerificationRequest(user.id, user.email);
		const second = await createEmailVerificationRequest(user.id, 'nouvelle@test.local');
		expect(await prisma.emailVerificationRequest.count({ where: { userId: user.id } })).toBe(1);
		expect(second).toMatchObject({ userId: user.id, email: 'nouvelle@test.local' });
		expect(second.code).toHaveLength(8);
		expect(second.id).not.toBe(first.id);

		expect((await getUserEmailVerificationRequest(user.id, second.id))?.code).toBe(second.code);
		expect(await getUserEmailVerificationRequest(user.id, UNKNOWN_ID)).toBeNull();
		await expect(getUserEmailVerificationRequest(user.id, 'pas-un-id')).rejects.toThrow(
			'Invalid email verification request ID'
		);
	});

	it('retrouve la demande depuis le cookie et le supprime si elle n’existe plus', async () => {
		const user = await createPaidUser();
		const request = await createEmailVerificationRequest(user.id, user.email);

		expect(
			await getUserEmailVerificationRequestFromRequest(eventWith({ cookie: request.id }).event)
		).toBeNull();
		expect(
			await getUserEmailVerificationRequestFromRequest(
				eventWith({ user, cookie: 'pas-un-id' }).event
			)
		).toBeNull();
		expect(await getUserEmailVerificationRequestFromRequest(eventWith({ user }).event)).toBeNull();

		const found = eventWith({ user, cookie: request.id });
		expect((await getUserEmailVerificationRequestFromRequest(found.event))?.id).toBe(request.id);
		expect(found.set).not.toHaveBeenCalled();

		const stale = eventWith({ user, cookie: UNKNOWN_ID });
		expect(await getUserEmailVerificationRequestFromRequest(stale.event)).toBeNull();
		expect(stale.set).toHaveBeenCalledWith(
			'email_verification',
			'',
			expect.objectContaining({ maxAge: 0 })
		);
	});

	it('pose et supprime le cookie', () => {
		const { event, set } = eventWith();
		const request = {
			id: 'abc',
			userId: 'u',
			code: 'C',
			email: 'e@test.local',
			expiresAt: new Date(Date.now() + 1000)
		};
		setEmailVerificationRequestCookie(event, request);
		deleteEmailVerificationRequestCookie(event);
		expect(set).toHaveBeenNthCalledWith(
			1,
			'email_verification',
			'abc',
			expect.objectContaining({ httpOnly: true, expires: request.expiresAt })
		);
		expect(set).toHaveBeenNthCalledWith(
			2,
			'email_verification',
			'',
			expect.objectContaining({ maxAge: 0 })
		);
	});
});

describe('envoi des emails sans serveur disponible', () => {
	const saved = { ...process.env };
	afterEach(() => {
		process.env = { ...saved };
		vi.restoreAllMocks();
	});

	it('signale une configuration SMTP incomplète', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => undefined);
		delete process.env.SMTP_HOST;
		await expect(sendVerificationEmail('a@test.local', 'ABCD1234')).rejects.toThrow(
			'SMTP configuration incomplete'
		);
	});

	it('signale un serveur injoignable', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => undefined);
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		Object.assign(process.env, {
			SMTP_HOST: '127.0.0.1',
			SMTP_PORT: '1',
			SMTP_USER: 'u',
			SMTP_PASS: 'p'
		});
		await expect(sendVerificationEmail('a@test.local', 'ABCD1234')).rejects.toThrow(
			'Email sending failed'
		);
		await expect(sendPasswordResetEmail('a@test.local', 'ABCD1234')).rejects.toThrow(
			'Email sending failed'
		);
	});
});
