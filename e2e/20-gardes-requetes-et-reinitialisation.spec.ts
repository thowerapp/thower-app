/**
 * Zone 1 — Gardes de requête (hooks) et double authentification pendant la réinitialisation du mot de passe.
 * Documentation : docs/app/01-compte-et-demarrage.md.
 */
import type { Page } from '@playwright/test';
import { test, expect } from './support/test';
import { createUser, db, enableTwoFactor, loginAs, startPasswordReset } from './support/db';

const ACTION_HEADERS = { origin: 'http://localhost:4380', 'x-sveltekit-action': 'true' };

async function post(page: Page, url: string, form: Record<string, string>) {
	const response = await page.request.post(url, { form, headers: ACTION_HEADERS });
	const body = (await response.json()) as { type: string; status?: number; data?: string };
	return { type: body.type, status: body.status ?? response.status(), data: body.data ?? '' };
}

test.describe('Gardes de requête', () => {
	test('AUT29 · l’outil de développement du navigateur reçoit 204, un cookie illisible est refusé, un jeton de session invalide est ignoré', async ({
		page
	}) => {
		const devtools = await page.request.get('/.well-known/appspecific/com.chrome.devtools.json');
		expect(devtools.status()).toBe(204);

		const badCookie = await page.request.get('/auth/login', { headers: { cookie: 'a=é' } });
		expect(badCookie.status()).toBe(400);

		const staleSession = await page.request.get('/auth/login', {
			headers: { cookie: 'auth_session=pas-un-identifiant' }
		});
		expect(staleSession.status()).toBe(200);
	});
});

test.describe('Réinitialisation du mot de passe : double authentification', () => {
	test('AUT30 · la page renvoie vers l’étape manquante', async ({ page, context }) => {
		const user = await createUser();
		await startPasswordReset(context, user.id);
		await page.goto('/auth/reset-password/2fa');
		expect(new URL(page.url()).pathname).toBe('/auth/reset-password/verify-email');

		await startPasswordReset(context, user.id, { emailVerified: true });
		await page.goto('/auth/reset-password/2fa');
		expect(new URL(page.url()).pathname).toBe('/auth/reset-password');
	});

	test('AUT31 · code TOTP : refusé hors contexte, champs vides ou absents, cinq essais puis blocage', async ({
		page,
		context
	}) => {
		const user = await createUser();
		const send = (form: Record<string, string>) =>
			post(page, '/auth/reset-password/2fa?/totp', form);

		await startPasswordReset(context, user.id, { emailVerified: false });
		expect((await send({ code: '000000' })).data).toContain('Action non autorisée');
		await startPasswordReset(context, user.id, { emailVerified: true });
		expect((await send({ code: '000000' })).data).toContain('Action non autorisée');

		await enableTwoFactor(user.id);
		await startPasswordReset(context, user.id, { emailVerified: true, twoFactorVerified: true });
		expect((await send({ code: '000000' })).data).toContain('Action non autorisée');

		const { id } = await startPasswordReset(context, user.id, { emailVerified: true });
		expect((await send({})).data).toContain('Champs manquants ou invalides');
		expect((await send({ code: '' })).data).toContain('Saisissez votre code');
		for (let i = 0; i < 5; i++)
			expect((await send({ code: '000000' })).data).toContain('incorrect');
		expect((await send({ code: '000000' })).data).toContain('Trop de tentatives');
		expect(
			(await db.passwordResetSession.findUniqueOrThrow({ where: { id } })).twoFactorVerified
		).toBe(false);
	});

	test('AUT32 · code de récupération : refusé hors contexte, champ vide, trois essais puis blocage', async ({
		page,
		context
	}) => {
		const user = await createUser();
		const send = (form: Record<string, string>) =>
			post(page, '/auth/reset-password/2fa?/recovery_code', form);

		await startPasswordReset(context, user.id, { emailVerified: true });
		expect((await send({ code: 'ABCDEFGHIJKLMNOP' })).data).toContain('Action non autorisée');

		await enableTwoFactor(user.id);
		await startPasswordReset(context, user.id, { emailVerified: true });
		expect((await send({ code: '' })).data).toContain('Saisissez votre code');
		for (let i = 0; i < 3; i++)
			expect((await send({ code: 'ABCDEFGHIJKLMNOP' })).data).toContain('incorrect');
		expect((await send({ code: 'ABCDEFGHIJKLMNOP' })).data).toContain('Trop de tentatives');
		expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).totpKey).not.toBeNull();
	});
});
