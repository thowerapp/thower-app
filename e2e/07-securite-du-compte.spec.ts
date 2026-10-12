/**
 * Zone 1 (suite) — Mot de passe oublié, double authentification, expiration du code d'email.
 * Documentation : docs/app/01-compte-et-demarrage.md (règles `SC1` à `SC9`).
 */
import { test, expect } from './support/test';
import {
	createUser,
	db,
	DEFAULT_PASSWORD,
	enableTwoFactor,
	latestVerificationCode,
	loginAs,
	startPasswordReset,
	totpCode,
	uniqueEmail
} from './support/db';

const NEW_PASSWORD = 'Nouveau2026x';

/** Saisie au clavier : après une tentative refusée, `fill` ne met pas à jour le champ de code contrôlé. */
async function enterCode(field: import('@playwright/test').Locator, code: string) {
	await field.click();
	await field.press('Control+a');
	await field.press('Backspace');
	await field.pressSequentially(code);
}

async function login(page: import('@playwright/test').Page, email: string, password = DEFAULT_PASSWORD) {
	await page.goto('/auth/login');
	await page.locator('input[name=email]').fill(email);
	await page.locator('input[name=password]').fill(password);
	await page.getByRole('button', { name: /continuer/i }).click();
}

test.describe('Mot de passe oublié', () => {
	test('SC1 · un email inconnu est signalé ; un email connu crée la demande, et un envoi en échec est annoncé', async ({ page }) => {
		await page.goto('/auth/forgot-password');
		await page.locator('input[name=email]').fill(uniqueEmail('inconnu'));
		await page.getByRole('button', { name: /^envoyer$/i }).click();
		await expect(page.getByText('Aucun compte avec cet email.').first()).toBeVisible();

		const user = await createUser();
		await page.locator('input[name=email]').fill(user.email);
		await page.getByRole('button', { name: /^envoyer$/i }).click();
		// Aucun email ne part en e2e : l'échec est annoncé au lieu d'une erreur 500.
		await expect(page.getByText('L’envoi de l’email a échoué, réessayez.').first()).toBeVisible();
		await expect(page).toHaveURL(/forgot-password/);
		expect(await db.passwordResetSession.count({ where: { userId: user.id } })).toBe(1);
	});

	test('SC2 · code reçu, puis nouveau mot de passe : ancienne session fermée, connexion avec le nouveau', async ({ page, context }) => {
		const user = await createUser();
		await loginAs(context, user.id);
		const otherSession = await db.session.findFirstOrThrow({ where: { userId: user.id } });
		const { code } = await startPasswordReset(context, user.id);

		await page.goto('/auth/reset-password');
		await expect(page).toHaveURL(/reset-password\/verify-email/);
		await enterCode(page.locator('input[name=code]'), 'FAUXCODE');
		await page.getByRole('button', { name: /^vérifier$/i }).click();
		await expect(page.getByText('Code incorrect.').first()).toBeVisible();

		await enterCode(page.locator('input[name=code]'), code);
		await page.getByRole('button', { name: /^vérifier$/i }).click();
		// Sans 2FA, on passe directement au nouveau mot de passe.
		await expect(page).toHaveURL(/\/auth\/reset-password\/?$/);

		await page.locator('input[name=password]').fill('faible');
		await page.getByRole('button', { name: /réinitialiser le mot de passe/i }).click();
		await expect(page).toHaveURL(/\/auth\/reset-password\/?$/);

		await page.locator('input[name=password]').fill(NEW_PASSWORD);
		await page.getByRole('button', { name: /réinitialiser le mot de passe/i }).click();
		await expect(page).toHaveURL(/\/auth\/?$/);

		expect(await db.session.findUnique({ where: { id: otherSession.id } })).toBeNull();
		expect(await db.session.count({ where: { userId: user.id } })).toBe(1);
		expect(await db.passwordResetSession.count({ where: { userId: user.id } })).toBe(0);

		await page.getByRole('button', { name: /se déconnecter/i }).click();
		await login(page, user.email, DEFAULT_PASSWORD);
		await expect(page.getByText('Email ou mot de passe incorrect.').first()).toBeVisible();
		await login(page, user.email, NEW_PASSWORD);
		await expect(page).toHaveURL(/\/auth\/?$/);
	});

	test('SC3 · la page du nouveau mot de passe est inaccessible sans code vérifié ; une demande expirée est refusée', async ({ page, context }) => {
		const user = await createUser();
		await page.goto('/auth/reset-password');
		await expect(page).toHaveURL(/forgot-password/);

		await startPasswordReset(context, user.id, { emailVerified: false });
		await page.goto('/auth/reset-password');
		await expect(page).toHaveURL(/reset-password\/verify-email/);

		await db.passwordResetSession.deleteMany({ where: { userId: user.id } });
		await startPasswordReset(context, user.id, { emailVerified: true, expiresAt: new Date(Date.now() - 60_000) });
		await page.goto('/auth/reset-password');
		await expect(page).toHaveURL(/forgot-password/);
		expect(await db.passwordResetSession.count({ where: { userId: user.id } })).toBe(0);
	});

	test('SC4 · avec la 2FA, le nouveau mot de passe exige un code TOTP, ou le code de récupération', async ({ page, context }) => {
		const user = await createUser();
		const { encodedTotpKey, recoveryCode } = await enableTwoFactor(user.id);
		const { code } = await startPasswordReset(context, user.id);

		await page.goto('/auth/reset-password/verify-email');
		await enterCode(page.locator('input[name=code]'), code);
		await page.getByRole('button', { name: /^vérifier$/i }).click();
		await expect(page).toHaveURL(/reset-password\/2fa/);

		await page.goto('/auth/reset-password');
		await expect(page, 'le mot de passe ne se change pas sans la 2FA').toHaveURL(/reset-password\/2fa/);

		await enterCode(page.locator('form[action="?/totp"] input[name=code]'), '000000');
		await page.locator('form[action="?/totp"]').getByRole('button', { name: /vérifier/i }).click();
		await expect(page.getByText('Code de double authentification incorrect.').first()).toBeVisible();

		await enterCode(page.locator('form[action="?/totp"] input[name=code]'), totpCode(encodedTotpKey));
		await page.locator('form[action="?/totp"]').getByRole('button', { name: /vérifier/i }).click();
		await expect(page).toHaveURL(/\/auth\/reset-password\/?$/);

		// Variante : le code de récupération réinitialise la 2FA.
		await db.passwordResetSession.updateMany({ where: { userId: user.id }, data: { twoFactorVerified: false } });
		await page.goto('/auth/reset-password/2fa');
		await enterCode(page.locator('form[action="?/recovery_code"] input[name=code]'), 'MAUVAISCODE12345');
		await page.locator('form[action="?/recovery_code"]').getByRole('button', { name: /vérifier/i }).click();
		await expect(page.getByText('Code incorrect.').first()).toBeVisible();
		await enterCode(page.locator('form[action="?/recovery_code"] input[name=code]'), recoveryCode);
		await page.locator('form[action="?/recovery_code"]').getByRole('button', { name: /vérifier/i }).click();
		await expect(page).toHaveURL(/\/auth\/reset-password\/?$/);
		expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).totpKey).toBeNull();
	});
});

test.describe('Double authentification', () => {
	test('SC5 · activée dans Mon compte : configuration au prochain accès, puis code demandé à chaque connexion', async ({ page, context }) => {
		const user = await createUser({ paid: true });
		await loginAs(context, user.id);
		await page.goto('/auth/account');
		await page.getByRole('switch').click();
		await expect.poll(async () => (await db.user.findUniqueOrThrow({ where: { id: user.id } })).isMfaEnabled).toBe(true);

		await page.goto('/auth/2fa/setup');
		const encodedKey = await page.locator('input[name=encodedTOTPKey]').inputValue();
		await enterCode(page.locator('input[name=code]'), '000000');
		await page.getByRole('button', { name: /^valider$/i }).click();
		await expect(page.getByText('Code de double authentification incorrect.').first()).toBeVisible();

		await enterCode(page.locator('input[name=code]'), totpCode(encodedKey));
		await page.getByRole('button', { name: /^valider$/i }).click();
		await expect(page).toHaveURL(/\/auth\/recovery-code/);
		await expect(page.locator('p.font-mono')).not.toBeEmpty();
		const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
		expect(stored.totpKey).not.toBeNull();

		// Nouvelle connexion : le mot de passe ne suffit plus.
		await page.context().clearCookies();
		await login(page, user.email);
		await expect(page).toHaveURL(/\/auth\/2fa$/);
		await page.goto('/user');
		await expect(page, 'espace utilisateur fermé tant que la 2FA n’est pas validée').toHaveURL(/\/auth\/2fa/);

		await enterCode(page.locator('input[name=code]'), '000000');
		await page.getByRole('button', { name: /^vérifier$/i }).click();
		await expect(page.getByText('Code de double authentification incorrect.').first()).toBeVisible();

		await enterCode(page.locator('input[name=code]'), totpCode(encodedKey));
		await page.getByRole('button', { name: /^vérifier$/i }).click();
		await expect(page).toHaveURL(/\/auth\/?$/);
		const session = await db.session.findFirstOrThrow({ where: { userId: user.id }, orderBy: { expiresAt: 'desc' } });
		expect(session.twoFactorVerified).toBe(true);
	});

	test('SC6 · un code de récupération réinitialise la 2FA et renouvelle le code', async ({ page, context }) => {
		const user = await createUser({ paid: true });
		const { recoveryCode } = await enableTwoFactor(user.id);
		await loginAs(context, user.id);
		const before = (await db.user.findUniqueOrThrow({ where: { id: user.id } })).recoveryCode;

		await page.goto('/auth/2fa/reset');
		await enterCode(page.locator('input[name=code]'), 'MAUVAISCODE12345');
		await page.getByRole('button', { name: /^vérifier$/i }).click();
		await expect(page.getByText('Code de récupération incorrect.').first()).toBeVisible();

		await enterCode(page.locator('input[name=code]'), recoveryCode);
		await page.getByRole('button', { name: /^vérifier$/i }).click();
		await expect(page).toHaveURL(/\/auth\/2fa\/setup/);

		const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
		expect(after.totpKey).toBeNull();
		expect(after.recoveryCode).not.toBe(before);
	});

	test('SC7 · le code de récupération n’est montré qu’à un compte dont la 2FA est validée', async ({ page, context }) => {
		const user = await createUser({ paid: true });
		await enableTwoFactor(user.id);
		await loginAs(context, user.id);
		await page.goto('/auth/recovery-code');
		await expect(page).toHaveURL(/\/auth\/2fa$/);
	});
});

test.describe('Code de vérification d’email', () => {
	test('SC8 · un code expiré (10 min) est remplacé par un nouveau ; l’ancien ne marche plus', async ({ page, context }) => {
		const user = await createUser({ emailVerified: false });
		await loginAs(context, user.id);
		await page.goto('/auth/verify-email');
		const expired = await latestVerificationCode(user.id);
		await db.emailVerificationRequest.updateMany({ where: { userId: user.id }, data: { expiresAt: new Date(Date.now() - 60_000) } });

		await enterCode(page.locator('input[name=code]'), expired);
		await page.getByRole('button', { name: /^vérifier$/i }).click();
		// En e2e aucun email ne part : l'échec d'envoi du nouveau code est annoncé (en production : « Un nouveau code… »).
		await expect(page.getByText(/ce code a expiré/i).first()).toBeVisible();
		const renewed = await db.emailVerificationRequest.findFirstOrThrow({ where: { userId: user.id }, orderBy: { expiresAt: 'desc' } });
		expect(renewed.expiresAt.getTime()).toBeGreaterThan(Date.now());
		expect(renewed.code).not.toBe(expired);
		expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).emailVerified).toBe(false);
	});
});

test.describe('Formulaires après une erreur', () => {
	test('SC9 · après une erreur, le formulaire reste utilisable (connexion, mot de passe oublié)', async ({ page }) => {
		const user = await createUser();
		await login(page, user.email, 'Mauvais2026x');
		await expect(page.getByText('Email ou mot de passe incorrect.').first()).toBeVisible();
		// Le formulaire ne doit pas disparaître : on corrige sans recharger la page.
		await page.locator('input[name=password]').fill(DEFAULT_PASSWORD);
		await page.getByRole('button', { name: /continuer/i }).click();
		await expect(page).toHaveURL(/\/auth\/?$/);

		await page.context().clearCookies();
		await page.goto('/auth/forgot-password');
		await page.locator('input[name=email]').fill(uniqueEmail('inconnu'));
		await page.getByRole('button', { name: /^envoyer$/i }).click();
		await expect(page.getByText('Aucun compte avec cet email.').first()).toBeVisible();
		await expect(page.locator('input[name=email]')).toBeVisible();
	});
});
