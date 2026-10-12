/**
 * Zone 1 — Double authentification : refus et limites de tentatives (code TOTP et code de récupération).
 * Documentation : docs/app/01-compte-et-demarrage.md.
 */
import type { Page } from '@playwright/test';
import { test, expect } from './support/test';
import { createUser, db, enableTwoFactor, loginAs } from './support/db';

const ACTION_HEADERS = { origin: 'http://localhost:4380', 'x-sveltekit-action': 'true' };

async function post(page: Page, url: string, form: Record<string, string>) {
	const response = await page.request.post(url, { form, headers: ACTION_HEADERS });
	const body = (await response.json()) as { type: string; status?: number; data?: string };
	return { type: body.type, status: body.status ?? response.status(), data: body.data ?? '' };
}

test.describe('Double authentification : garde-fous', () => {
	test('AUT23 · code TOTP : format invalide, code faux, cinq essais puis blocage ; refusé si déjà validé ou sans 2FA', async ({
		page,
		context
	}) => {
		const user = await createUser();
		await enableTwoFactor(user.id);
		await loginAs(context, user.id);
		const send = (code: string) => post(page, '/auth/2fa?/totp', { code });

		expect((await send('12')).data).toContain('Données invalides');
		for (let i = 0; i < 5; i++) expect((await send('000000')).data).toContain('incorrect');
		expect((await send('000000')).data).toContain('Trop de tentatives');
		expect(
			(await db.session.findFirstOrThrow({ where: { userId: user.id } })).twoFactorVerified
		).toBe(false);

		// Session déjà validée : l'action n'a plus lieu d'être.
		await db.session.updateMany({ where: { userId: user.id }, data: { twoFactorVerified: true } });
		expect((await send('000000')).data).toContain('Action non autorisée');

		const without2fa = await createUser();
		await context.clearCookies();
		await loginAs(context, without2fa.id);
		expect((await send('000000')).data).toContain('Action non autorisée');
	});

	test('AUT24 · code de récupération : code faux, trois essais puis blocage ; refusé sans 2FA ou session déjà validée', async ({
		page,
		context
	}) => {
		const user = await createUser();
		await enableTwoFactor(user.id);
		await loginAs(context, user.id);
		const send = (code: string) => post(page, '/auth/2fa/reset?/recovery_code', { code });

		for (let i = 0; i < 3; i++)
			expect((await send('ABCDEFGHIJKLMNOP')).data).toContain('incorrect');
		expect((await send('ABCDEFGHIJKLMNOP')).data).toContain('Trop de tentatives');
		expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).totpKey).not.toBeNull();

		const without2fa = await createUser();
		await context.clearCookies();
		await loginAs(context, without2fa.id);
		expect((await send('ABCDEFGHIJKLMNOP')).data).toContain('Action non autorisée');
	});

	test('AUT25 · configuration de la 2FA : un compte déjà configuré ou dont l’email n’est pas vérifié est refusé, une clé invalide aussi', async ({
		page,
		context
	}) => {
		const configured = await createUser();
		await enableTwoFactor(configured.id);
		await db.session.deleteMany({});
		await loginAs(context, configured.id);
		await db.session.updateMany({
			where: { userId: configured.id },
			data: { twoFactorVerified: true }
		});
		const setup = (form: Record<string, string>) => post(page, '/auth/2fa/setup?/setuptotp', form);

		expect((await setup({ code: '123456', encodedTOTPKey: 'AAAA' })).data).toMatch(
			/déjà activée|invalide/
		);

		const unverified = await createUser({ emailVerified: false });
		await context.clearCookies();
		await loginAs(context, unverified.id);
		expect((await setup({ code: '123456', encodedTOTPKey: 'AAAA' })).data).toContain(
			'Vérifiez d’abord votre email'
		);

		const fresh = await createUser();
		await context.clearCookies();
		await loginAs(context, fresh.id);
		expect((await setup({ code: '12', encodedTOTPKey: 'AAAA' })).data).toContain(
			'Données invalides'
		);
		expect((await setup({ code: '123456', encodedTOTPKey: 'AAAA' })).data).toContain(
			'Clé de double authentification invalide'
		);
		expect((await db.user.findUniqueOrThrow({ where: { id: fresh.id } })).totpKey).toBeNull();
	});
});
