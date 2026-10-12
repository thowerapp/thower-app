/**
 * Zone 1 — Emails du compte avec un serveur SMTP factice : vérification, renvoi, changement d'email,
 * mot de passe oublié, inscription, notification de contact ; limites de tentatives et erreurs de connexion.
 * Documentation : docs/app/01-compte-et-demarrage.md.
 */
import type { Page } from '@playwright/test';
import { test, expect } from './support/test';
import {
	createOnboardedUser,
	createUser,
	db,
	enableTwoFactor,
	latestVerificationCode,
	loginAs,
	uniqueEmail
} from './support/db';
import { fakes } from './support/fakes';

const ACTION_HEADERS = { origin: 'http://localhost:4380', 'x-sveltekit-action': 'true' };

type Result = { type: string; status: number; location?: string; data: string };

async function post(
	page: Page,
	url: string,
	form: Record<string, string>,
	headers: Record<string, string> = {}
): Promise<Result> {
	const response = await page.request.post(url, {
		form,
		headers: { ...ACTION_HEADERS, ...headers }
	});
	const body = (await response.json()) as {
		type: string;
		status?: number;
		location?: string;
		data?: string;
	};
	return {
		type: body.type,
		status: body.status ?? response.status(),
		location: body.location,
		data: body.data ?? ''
	};
}

const sent = async () => fakes.smtp.messages();

test.describe('Vérification de l’email', () => {
	test('AUT9 · saisie du code : format, tentatives limitées, demande absente', async ({
		page,
		context
	}) => {
		const user = await createUser({ emailVerified: false });
		await loginAs(context, user.id);

		// Sans demande de vérification (cookie absent), rien à comparer.
		expect(await post(page, '/auth/verify-email?/verifyCode', { code: '12345678' })).toMatchObject({
			type: 'failure',
			status: 401
		});

		await page.goto('/auth/verify-email');
		expect(await post(page, '/auth/verify-email?/verifyCode', { code: 'abc' })).toMatchObject({
			type: 'failure',
			status: 400
		});
		for (let i = 0; i < 5; i++) {
			expect(
				await post(page, '/auth/verify-email?/verifyCode', { code: '00000000' })
			).toMatchObject({ type: 'failure', status: 400 });
		}
		expect(await post(page, '/auth/verify-email?/verifyCode', { code: '00000000' })).toMatchObject({
			type: 'failure',
			status: 429
		});
		expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).emailVerified).toBe(false);
	});

	test('AUT10 · code valide : l’email est vérifié ; avec la 2FA exigée, la configuration suit', async ({
		page,
		context
	}) => {
		const user = await createUser({ emailVerified: false });
		await loginAs(context, user.id);
		await page.goto('/auth/verify-email');
		const ok = await post(page, '/auth/verify-email?/verifyCode', {
			code: await latestVerificationCode(user.id)
		});
		expect(ok).toMatchObject({ type: 'redirect', location: '/auth/' });
		expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).emailVerified).toBe(true);

		const needsMfa = await createUser({ emailVerified: false });
		await db.user.update({ where: { id: needsMfa.id }, data: { isMfaEnabled: true } });
		await context.clearCookies();
		await loginAs(context, needsMfa.id);
		await page.goto('/auth/verify-email');
		const toSetup = await post(page, '/auth/verify-email?/verifyCode', {
			code: await latestVerificationCode(needsMfa.id)
		});
		expect(toSetup).toMatchObject({ type: 'redirect', location: '/auth/2fa/setup' });
	});

	test('AUT11 · un code expiré est remplacé par un nouveau, envoyé par email', async ({
		page,
		context
	}) => {
		await fakes.smtp.up();
		const user = await createUser({ emailVerified: false });
		await loginAs(context, user.id);
		await page.goto('/auth/verify-email');
		const first = await latestVerificationCode(user.id);
		await db.emailVerificationRequest.updateMany({
			where: { userId: user.id },
			data: { expiresAt: new Date(Date.now() - 1000) }
		});

		const expired = await post(page, '/auth/verify-email?/verifyCode', { code: first });
		expect(expired).toMatchObject({ type: 'failure', status: 400 });
		const messages = await sent();
		expect(messages.at(-1)?.to).toEqual([user.email]);
		const second = await latestVerificationCode(user.id);
		expect(messages.at(-1)?.data).toContain(second);

		expect(await post(page, '/auth/verify-email?/verifyCode', { code: second })).toMatchObject({
			type: 'redirect'
		});
	});

	test('AUT12 · renvoi du code : email envoyé, limité à 3 par période, refusé sans session ou pour un compte déjà vérifié', async ({
		page,
		context
	}) => {
		await fakes.smtp.up();
		const user = await createUser({ emailVerified: false });
		await loginAs(context, user.id);
		await page.goto('/auth/verify-email');
		const before = (await sent()).length;

		const resend = await post(page, '/auth/verify-email?/resendCode', {});
		expect(resend.type).toBe('success');
		expect((await sent()).length).toBe(before + 1);
		expect((await sent()).at(-1)?.data).toContain(await latestVerificationCode(user.id));
		expect((await post(page, '/auth/verify-email?/resendCode', {})).type).toBe('success');
		expect((await post(page, '/auth/verify-email?/resendCode', {})).type).toBe('success');
		expect(await post(page, '/auth/verify-email?/resendCode', {})).toMatchObject({
			type: 'failure',
			status: 429
		});

		// Un compte déjà vérifié n'a aucune raison de recevoir un code.
		const verified = await createUser();
		await context.clearCookies();
		await loginAs(context, verified.id);
		expect(await post(page, '/auth/verify-email?/resendCode', {})).toMatchObject({
			type: 'failure',
			status: 403
		});
	});

	test('AUT13 · 2FA configurée mais non validée : la saisie et le renvoi du code renvoient vers la saisie du code 2FA', async ({
		page,
		context
	}) => {
		const user = await createUser({ emailVerified: false });
		await enableTwoFactor(user.id);
		await loginAs(context, user.id);
		expect(await post(page, '/auth/verify-email?/verifyCode', { code: '12345678' })).toMatchObject({ type: 'redirect', location: '/auth/2fa' });
expect(await post(page, '/auth/verify-email?/resendCode', {})).toMatchObject({ type: 'redirect', location: '/auth/2fa' });
	});
});

test.describe('Changement d’email et de mot de passe', () => {
	test('AUT14 · changer d’email : adresse prise ou invalide refusée, envoi en échec annoncé, puis code reçu et email remplacé', async ({
		page,
		context
	}) => {
		const user = await createOnboardedUser();
		const other = await createUser();
		await loginAs(context, user.id);

		expect(await post(page, '/auth/account?/email', { email: 'pas-un-email' })).toMatchObject({
			type: 'failure',
			status: 400
		});
		expect(await post(page, '/auth/account?/email', { email: other.email })).toMatchObject({
			type: 'failure',
			status: 400
		});

		// Serveur d'emails éteint : l'échec est annoncé, l'email reste inchangé.
		const down = await post(page, '/auth/account?/email', { email: uniqueEmail('nouveau') });
		expect(down).toMatchObject({ type: 'failure', status: 500 });

		await fakes.smtp.up();
		const fresh = uniqueEmail('nouveau');
		expect(await post(page, '/auth/account?/email', { email: fresh })).toMatchObject({
			type: 'redirect',
			location: '/auth/verify-email'
		});
		expect((await sent()).at(-1)?.to).toEqual([fresh]);
		expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).email).toBe(user.email);

		await page.goto('/auth/verify-email');
		expect(
			await post(page, '/auth/verify-email?/verifyCode', {
				code: await latestVerificationCode(user.id)
			})
		).toMatchObject({ type: 'redirect' });
		expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).email).toBe(fresh);
	});

	test('AUT15 · mot de passe : ancien mot de passe exigé, nouveau valide, session conservée', async ({
		page,
		context
	}) => {
		const user = await createOnboardedUser();
		await loginAs(context, user.id);
		const url = '/auth/account?/password';

		expect(
			await post(page, url, { password: 'Thower-e2e-2026', new_password: 'court' })
		).toMatchObject({ type: 'failure', status: 400 });
		expect(
			await post(page, url, { password: 'Mauvais-mdp-1', new_password: 'Nouveau-mdp-2026' })
		).toMatchObject({ type: 'failure', status: 400 });
		const before = (await db.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash;

		expect(
			(await post(page, url, { password: 'Thower-e2e-2026', new_password: 'Nouveau-mdp-2026' }))
				.type
		).toBe('success');
		expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash).not.toBe(
			before
		);
		expect((await page.request.get('/auth/account', { maxRedirects: 0 })).status()).toBe(200);
	});

	test('AUT16 · compte Google : le mot de passe ne peut pas être modifié', async ({
		page,
		context
	}) => {
		const user = await createOnboardedUser();
		await db.user.update({
			where: { id: user.id },
			data: { passwordHash: null, googleId: 'google-sub-e2e' }
		});
		await loginAs(context, user.id);
		expect(
			await post(page, '/auth/account?/password', {
				password: 'Thower-e2e-2026',
				new_password: 'Nouveau-mdp-2026'
			})
		).toMatchObject({ type: 'failure', status: 400 });
	});

	test('AUT17 · 2FA non validée : changement d’email et de mot de passe renvoyés vers la saisie du code 2FA', async ({
		page,
		context
	}) => {
		const user = await createOnboardedUser();
		await enableTwoFactor(user.id);
		await loginAs(context, user.id);
		const hashBefore = (await db.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash;
expect(await post(page, '/auth/account?/password', { password: 'Thower-e2e-2026', new_password: 'Nouveau-mdp-2026' })).toMatchObject({ type: 'redirect', location: '/auth/2fa' });
expect(await post(page, '/auth/account?/email', { email: uniqueEmail() })).toMatchObject({ type: 'redirect', location: '/auth/2fa' });
expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash).toBe(hashBefore);
	});
});

test.describe('Mot de passe oublié, inscription et contact par email', () => {
	test('AUT18 · mot de passe oublié : email invalide refusé, code envoyé, 3 demandes par période', async ({
		page
	}) => {
		await fakes.smtp.up();
		const user = await createUser();
		expect(
			await post(page, '/auth/forgot-password?/forgotPassword', { email: 'pas-un-email' })
		).toMatchObject({ type: 'failure', status: 400 });
		expect(
			await post(page, '/auth/forgot-password?/forgotPassword', { email: 'inconnu@test.local' })
		).toMatchObject({ type: 'failure', status: 400 });

		const ask = () => post(page, '/auth/forgot-password?/forgotPassword', { email: user.email });
		expect(await ask()).toMatchObject({
			type: 'redirect',
			location: '/auth/reset-password/verify-email'
		});
		const session = await db.passwordResetSession.findFirstOrThrow({ where: { userId: user.id } });
		expect((await sent()).at(-1)?.to).toEqual([user.email]);
		expect((await sent()).at(-1)?.data).toContain(session.code);
		expect((await ask()).type).toBe('redirect');
		expect((await ask()).type).toBe('redirect');
		expect(await ask()).toMatchObject({ type: 'failure', status: 400 });
	});

	test('AUT19 · inscription : formulaire invalide refusé, compte créé avec son email de vérification, tentatives limitées', async ({
		page
	}) => {
		await fakes.smtp.up();
		const headers = { 'x-forwarded-for': '10.20.30.40' };
		const email = uniqueEmail('inscrit');
		const form = {
			username: 'Nouveau',
			email,
			password: 'Motdepasse1',
			confirmPassword: 'Motdepasse1'
		};

		expect(
			await post(
				page,
				'/auth/signup?/signup',
				{ ...form, password: 'faible', confirmPassword: 'faible' },
				headers
			)
		).toMatchObject({ type: 'failure', status: 400 });
		expect(await db.user.count()).toBe(0);

		expect(await post(page, '/auth/signup?/signup', form, headers)).toMatchObject({
			type: 'redirect',
			location: '/auth/2fa/setup'
		});
		const created = await db.user.findUniqueOrThrow({ where: { email } });
		expect((await sent()).at(-1)?.to).toEqual([email]);
		expect((await sent()).at(-1)?.data).toContain(await latestVerificationCode(created.id));

		// Même formulaire depuis la page d'accueil, puis limite de 3 inscriptions par intervalle et par adresse.
		const home = await post(page, '/?/signup', { ...form, email: uniqueEmail('accueil') }, headers);
		expect(home).toMatchObject({ type: 'redirect', location: '/auth/2fa/setup' });
		expect(
			await post(
				page,
				'/?/signup',
				{ ...form, password: 'faible', confirmPassword: 'faible' },
				headers
			)
		).toMatchObject({ type: 'failure', status: 400 });
		expect(
			await post(page, '/?/signup', { ...form, email: uniqueEmail('limite-1') }, headers)
		).toMatchObject({ type: 'redirect' });
		expect(await post(page, '/?/signup', { ...form, email: uniqueEmail('limite-2') }, headers)).toMatchObject({ type: 'redirect' });
expect(await post(page, '/?/signup', { ...form, email: uniqueEmail('limite-3') }, headers)).toMatchObject({ type: 'failure', status: 429 });
expect(await db.user.count({ where: { email: { startsWith: 'limite-3' } } })).toBe(0);
	});

	test('AUT20 · contact : la notification est envoyée à l’adresse configurée', async ({ page }) => {
		await fakes.smtp.up();
		const response = await post(page, '/contact?/submit', {
			name: 'Camille',
			email: 'camille@test.local',
			subject: 'Devis',
			message: 'Bonjour, pouvez-vous me rappeler ?'
		});
		expect(response.type).toBe('success');
		const mail = (await sent()).at(-1);
		expect(mail?.to).toEqual(['e2e@test.local']);
		expect(mail?.data).toContain('[Contact Thower] Devis');
		expect(mail?.data).toContain('camille@test.local');
	});
});

test.describe('Connexion : erreurs', () => {
	test('AUT21 · connexion : formulaire invalide, compte inconnu, compte Google, mauvais mot de passe, tentatives ralenties', async ({
		page
	}) => {
		const user = await createUser();
		const google = await createUser();
		await db.user.update({ where: { id: google.id }, data: { googleId: 'google-sub-login' } });
		const login = (email: string, password: string) =>
			post(page, '/auth/login?/login', { email, password });

		expect(await login('', '')).toMatchObject({ type: 'failure', status: 400 });
		expect(await login('inconnu@test.local', 'Thower-e2e-2026')).toMatchObject({
			type: 'failure',
			status: 400
		});
		expect(await login(google.email, 'Thower-e2e-2026')).toMatchObject({
			type: 'failure',
			status: 400
		});
		expect(await login(user.email, 'Mauvais-mdp-1')).toMatchObject({
			type: 'failure',
			status: 400
		});
		expect((await login(user.email, 'Mauvais-mdp-2')).data).toContain('Email ou mot de passe incorrect');
// Troisième échec immédiat : l'attente de 1 s n'est pas écoulée.
expect((await login(user.email, 'Mauvais-mdp-3')).data).toContain('Trop de tentatives');
		expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
	});

	test('AUT22 · connexion réussie : redirection selon l’état du compte', async ({ page }) => {
		const login = async (email: string) => {
// La connexion précédente a posé un cookie de session : il fausserait la suivante.
await page.context().clearCookies();
return post(page, '/auth/login?/login', { email, password: 'Thower-e2e-2026' });
};
		const plain = await createUser();
		expect(await login(plain.email)).toMatchObject({ type: 'redirect', location: '/auth' });

		const unverified = await createUser({ emailVerified: false });
		expect(await login(unverified.email)).toMatchObject({
			type: 'redirect',
			location: '/auth/verify-email'
		});

		const noKey = await createUser();
		await db.user.update({ where: { id: noKey.id }, data: { isMfaEnabled: true } });
		expect(await login(noKey.email)).toMatchObject({
			type: 'redirect',
			location: '/auth/2fa/setup'
		});

		const mfa = await createUser();
		await enableTwoFactor(mfa.id);
		expect(await login(mfa.email)).toMatchObject({ type: 'redirect', location: '/auth/2fa' });
	});
});
