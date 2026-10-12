import { describe, expect, it, vi } from 'vitest';
import { prisma } from '$lib/server';
import { createPaidUser } from '$lib/server/testing/integration/db';
import {
	createUserInDatabase,
	createUserWithGoogleOAuth,
	deleteUser,
	findUserByGoogleId,
	findUserWithRecoveryCode,
	getAllUsers,
	getUserByEmailPrisma,
	getUserByGoogleIdPrisma,
	getUserByIdPrisma,
	getUserMFA,
	getUserPasswordHash,
	getUserRecoverCode,
	getUserTOTPKey,
	getUsersById,
	latestUsers,
	linkGoogleOAuthToExistingUser,
	updateUserEmail,
	updateUserMFA,
	updateUserPasswordPrisma,
	updateUserRecoveryCode,
	updateUserRole,
	verifyUserEmail
} from './user';

describe('comptes (base réelle)', () => {
	it('crée un compte Google (identifiant tiré de l’email, email vérifié) puis le retrouve', async () => {
		const created = await createUserWithGoogleOAuth('g-1', 'prenom.nom@test.local', 'Prénom Nom', 'https://img.test/p.jpg');
		expect(created).toMatchObject({ username: 'prenom.nom', emailVerified: true, role: 'CLIENT', passwordHash: null, nutritionDaysAllocated: 0 });
		expect((await findUserByGoogleId('g-1'))?.id).toBe(created.id);
		expect((await getUserByGoogleIdPrisma('g-1'))?.email).toBe('prenom.nom@test.local');
		expect(await findUserByGoogleId('inconnu')).toBeNull();

		const withoutLocalPart = await createUserWithGoogleOAuth('g-2', '@test.local', 'Sans nom', '');
		expect(withoutLocalPart.username).toBeNull();
	});

	it('rattache Google à un compte existant et marque son email comme vérifié', async () => {
		const user = await createUserInDatabase('lie@test.local', 'Lie', 'hash', 'code', 'CLIENT', false, null);
		const linked = await linkGoogleOAuthToExistingUser(user.id, 'g-3', 'Lié', 'https://img.test/l.jpg');
		expect(linked).toMatchObject({ googleId: 'g-3', name: 'Lié', emailVerified: true });
		expect((await getUserByEmailPrisma('lie@test.local'))?.googleId).toBe('g-3');
	});

	it('met à jour mot de passe, email, vérification, code de récupération et 2FA', async () => {
		const user = await createUserInDatabase('maj@test.local', 'Maj', 'hash-1', 'code-1', 'CLIENT', false, null);
		await updateUserPasswordPrisma(user.id, 'hash-2');
		expect(await getUserPasswordHash(user.id)).toBe('hash-2');
		expect(await getUserPasswordHash(undefined, 'maj@test.local')).toBe('hash-2');

		expect((await updateUserEmail(user.id, 'neuf@test.local')).emailVerified).toBe(true);
		await prisma.user.update({ where: { id: user.id }, data: { emailVerified: false } });
		expect((await verifyUserEmail(user.id, 'ancien@test.local')).count).toBe(0);
		expect((await verifyUserEmail(user.id, 'neuf@test.local')).count).toBe(1);

		await updateUserRecoveryCode(user.id, 'chiffre');
		expect((await findUserWithRecoveryCode(user.id))?.recoveryCode).toBe('chiffre');
		expect(await getUserRecoverCode(user.id)).toBe('chiffre');

		expect(await getUserMFA(user.id)).toEqual({ isMfaEnabled: false });
		await updateUserMFA(user.id, { isMfaEnabled: true });
		expect(await getUserMFA(user.id)).toEqual({ isMfaEnabled: true });
		expect(await getUserTOTPKey(user.id)).toBeNull();
	});

	it('signale un compte introuvable ou un identifiant manquant', async () => {
		const unknown = '000000000000000000000000';
		await expect(getUserPasswordHash()).rejects.toThrow('Missing user identifier');
		await expect(getUserPasswordHash(unknown)).rejects.toThrow('User not found');
		await expect(getUserRecoverCode(unknown)).rejects.toThrow('User not found');
		expect(await getUserByIdPrisma(unknown)).toBeNull();
		expect(await getUsersById(unknown)).toBeNull();
	});

	it('change le rôle, liste les comptes et affiche les derniers inscrits', async () => {
		const first = await createUserInDatabase('un@test.local', 'Un', 'h', 'c', 'CLIENT', true, null);
		await createUserInDatabase('deux@test.local', 'Deux', 'h', 'c', 'CLIENT', true, null);
		const promoted = await updateUserRole(first.id, 'ADMIN');
		expect(promoted.role).toBe('ADMIN');
		expect((await getUserByIdPrisma(first.id))?.role).toBe('ADMIN');
		expect((await getUsersById(first.id))?.email).toBe('un@test.local');

		expect((await getAllUsers()).map((u) => u.email).sort()).toEqual(['deux@test.local', 'un@test.local']);
		const latest = await latestUsers();
		expect(latest.map((u) => u.email)).toEqual(['deux@test.local', 'un@test.local']);
		expect(typeof latest[0].createdAt).toBe('string');
	});

	it('supprime un compte en gardant ses paiements, sans compte rattaché', async () => {
		const user = await createPaidUser();
		expect(await deleteUser(user.id)).toEqual({ success: true });
		expect(await prisma.user.count({ where: { id: user.id } })).toBe(0);
		const payments = await prisma.transaction.findMany();
		expect(payments).toHaveLength(1);
		expect(payments[0].userId).toBeNull();
	});

	it('remonte l’échec d’une suppression ou d’un changement de rôle sur un compte inexistant', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		await expect(deleteUser('000000000000000000000000')).rejects.toThrow('Error deleting user');
		await expect(updateUserRole('000000000000000000000000', 'ADMIN')).rejects.toThrow();
		error.mockRestore();
	});
});
