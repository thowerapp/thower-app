/**
 * Zone 1 — Garde-fous de l'authentification : redirections selon l'état du compte (anonyme, email non vérifié,
 * sans 2FA, 2FA configurée mais non validée) et refus des actions sans session valide.
 * Documentation : docs/app/01-compte-et-demarrage.md.
 */
import type { Page } from '@playwright/test';
import { test, expect } from './support/test';
import { createOnboardedUser, createUser, db, enableTwoFactor, loginAs } from './support/db';

const ACTION_HEADERS = { origin: 'http://localhost:4380', 'x-sveltekit-action': 'true' };

/** Page demandée sans suivre la redirection : renvoie le statut et la destination. */
async function visit(page: Page, url: string) {
	const response = await page.request.get(url, { maxRedirects: 0 });
	const location = response.headers()['location'] ?? null;
	return {
		status: response.status(),
		location: location ? new URL(location, 'http://localhost:4380').pathname : null
	};
}

async function expectRedirects(page: Page, expected: Record<string, string>) {
	for (const [url, destination] of Object.entries(expected)) {
		const { status, location } = await visit(page, url);
		expect([status, location], url).toEqual([expect.stringMatching(/^30[237]$/), destination]);
	}
}

const normalize = (path: string) => path.replace(/\/$/, '') || '/';

async function expectGuards(page: Page, expected: Record<string, string>) {
	for (const [url, destination] of Object.entries(expected)) {
		const { status, location } = await visit(page, url);
		expect(String(status), `${url} → statut`).toMatch(/^30[237]$/);
		expect(normalize(location ?? ''), `${url} → destination`).toBe(normalize(destination));
	}
}

test.describe('Redirections selon l’état du compte', () => {
	test('AUT1 · anonyme : l’espace renvoie vers la connexion, la réinitialisation vers « mot de passe oublié »', async ({
		page
	}) => {
		await expectGuards(page, {
			'/auth': '/auth/login',
			'/auth/account': '/auth/login',
			'/auth/2fa': '/auth/login',
			'/auth/2fa/setup': '/auth/login',
			'/auth/2fa/reset': '/auth/login',
			'/auth/recovery-code': '/auth/login',
			'/auth/factures': '/auth/login',
			'/auth/factures/000000000000000000000000': '/auth/login',
			'/auth/photos/pending': '/auth/login',
			'/auth/well-being': '/auth/login',
			'/auth/verify-email': '/auth/login',
			'/auth/subscription': '/auth/login',
			'/auth/measurement': '/auth/login',
			'/auth/signout': '/auth/login',
			'/auth/reset-password': '/auth/forgot-password',
			'/auth/reset-password/verify-email': '/auth/forgot-password',
			'/auth/reset-password/2fa': '/auth/forgot-password'
		});
	});

	test('AUT2 · email non vérifié : tout renvoie vers la vérification', async ({
		page,
		context
	}) => {
		const user = await createUser({ emailVerified: false });
		await loginAs(context, user.id);
		await expectGuards(page, {
			'/': '/auth/verify-email',
			'/auth/login': '/auth/verify-email',
			'/auth/signup': '/auth/verify-email',
			'/auth/account': '/auth/verify-email',
			'/auth/factures': '/auth/verify-email',
			'/auth/factures/000000000000000000000000': '/auth/verify-email',
			'/auth/2fa': '/auth/verify-email',
			'/auth/2fa/reset': '/auth/verify-email',
			'/auth/recovery-code': '/auth/verify-email'
		});
	});

	test('AUT3 · compte vérifié : connexion, inscription et vérification renvoient vers l’espace, de même que la 2FA une fois validée', async ({
		page,
		context
	}) => {
		const user = await createOnboardedUser();
		await loginAs(context, user.id);
		await expectGuards(page, {
			'/': '/auth',
			'/auth/login': '/auth',
			'/auth/signup': '/auth',
			'/auth/verify-email': '/auth'
		});

		// Une session dont la 2FA est validée n'a plus rien à y faire.
		await db.session.updateMany({ where: { userId: user.id }, data: { twoFactorVerified: true } });
		await expectGuards(page, { '/auth/2fa': '/auth', '/auth/2fa/reset': '/auth' });
	});

	test('AUT4 · 2FA exigée mais pas encore configurée : tout renvoie vers sa configuration', async ({
		page,
		context
	}) => {
		const user = await createUser();
		await db.user.update({ where: { id: user.id }, data: { isMfaEnabled: true } });
		await loginAs(context, user.id);
		await expectGuards(page, {
			'/': '/auth/2fa/setup',
			'/auth': '/auth/2fa/setup',
			'/auth/login': '/auth/2fa/setup',
			'/auth/signup': '/auth/2fa/setup',
			'/auth/account': '/auth/2fa/setup',
			'/auth/2fa': '/auth/2fa/setup',
			'/auth/2fa/reset': '/auth/2fa/setup',
			'/auth/recovery-code': '/auth/2fa/setup'
		});
	});

	test('AUT5 · 2FA configurée mais code non saisi sur cette session : tout renvoie vers la saisie du code', async ({
		page,
		context
	}) => {
		const user = await createUser();
		await enableTwoFactor(user.id);
		await loginAs(context, user.id);
		await expectGuards(page, {
			'/': '/auth/2fa',
			'/auth': '/auth/2fa',
			'/auth/login': '/auth/2fa',
			'/auth/signup': '/auth/2fa',
			'/auth/account': '/auth/2fa',
			'/auth/recovery-code': '/auth/2fa'
		});
	});
});

test.describe('Actions sans session valide', () => {
	test('AUT6 · sans session, les actions de compte et de vérification sont refusées sans rien modifier', async ({
		page
	}) => {
		const user = await createUser({ emailVerified: false });
		const before = await db.user.findUniqueOrThrow({ where: { id: user.id } });
		const refused = async (url: string, form: Record<string, string>) => {
			const response = await page.request.post(url, { form, headers: ACTION_HEADERS });
			const body = (await response.json()) as { type: string; status?: number };
			expect(body.type, url).toBe('failure');
			expect(body.status, url).toBeGreaterThanOrEqual(400);
			return body.status;
		};

		expect(await refused('/auth/verify-email?/verifyCode', { code: '12345678' })).toBe(401);
		expect(await refused('/auth/verify-email?/resendCode', {})).toBe(401);
		expect(
			await refused('/auth/account?/password', {
				password: 'Ancien-mdp-1',
				new_password: 'Nouveau-mdp-1'
			})
		).toBe(401);
		expect(await refused('/auth/account?/email', { email: 'autre@test.local' })).toBe(401);
		await refused('/auth/2fa?/totp', { code: '123456' });
		await refused('/auth/2fa/reset?/recovery_code', { code: 'ABCDEFGHIJKLMNOP' });
		await refused('/auth/2fa/setup?/setuptotp', { code: '123456', encodedTOTPKey: 'x' });
		await refused('/auth/reset-password?/resetPassword', { password: 'Nouveau-mdp-1' });
		await refused('/auth/reset-password/verify-email?/verify', { code: '12345678' });
		await refused('/auth/reset-password/2fa?/totp', { code: '123456' });
		await refused('/auth/reset-password/2fa?/recovery_code', { code: 'ABCDEFGHIJKLMNOP' });

		expect(await db.user.findUniqueOrThrow({ where: { id: user.id } })).toEqual(before);
	});

	test('AUT7 · sans session, souscription, mensurations et photos sont refusées', async ({
		page
	}) => {
		for (const [url, form] of [
			['/auth/subscription?/redeemCode', { code: 'ABC' }],
			['/auth/subscription?/createCheckout', {}],
			['/auth/measurement?/save', {}],
			['/auth/photos?/submitPhotos', {}],
			['/auth/well-being?/default', {}]
		] as const) {
			const response = await page.request.post(url, { form, headers: ACTION_HEADERS });
			const body = (await response.json()) as { type: string; status?: number };
			expect(['failure', 'redirect', 'error'], url).toContain(body.type);
		}
		expect(await db.transaction.count()).toBe(0);
		expect(await db.progressPhoto.count()).toBe(0);
	});

	test('AUT8 · la déconnexion ferme la session, par lien ou par formulaire', async ({
		page,
		context
	}) => {
		const user = await createOnboardedUser();
		await loginAs(context, user.id);
		expect(await db.session.count({ where: { userId: user.id } })).toBe(1);
		const viaGet = await visit(page, '/auth/signout');
		expect(viaGet.location).toBe('/auth/login');
		expect(await db.session.count({ where: { userId: user.id } })).toBe(0);

		await loginAs(context, user.id);
		const viaPost = await page.request.post('/auth/signout', {
			maxRedirects: 0,
			headers: { origin: 'http://localhost:4380' }
		});
		expect(viaPost.status()).toBe(302);
		expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
	});
});
