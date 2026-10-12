/**
 * Zone 1 — Compte, paiement et formulaire de démarrage.
 * Documentation : docs/app/01-compte-et-demarrage.md (chaque règle y renvoie à son test).
 */
import { test, expect } from './support/test';
import { createUser, db, DEFAULT_PASSWORD, latestVerificationCode, loginAs, uniqueEmail } from './support/db';
import { completeOnboardingWizard, goToMorphologyStep, sendCheckoutCompleted, seedRecipeCatalog } from './support/flows';

const STRONG_PASSWORD = 'Thower2026x';

async function fillSignup(page: import('@playwright/test').Page, email: string, password = STRONG_PASSWORD) {
	await page.goto('/auth/signup');
	await page.locator('input[name=username]').fill('Nouvelle recrue');
	await page.locator('input[name=email]').fill(email);
	await page.locator('input[name=password]').fill(password);
	await page.locator('input[name=confirmPassword]').fill(password);
	await page.getByRole('button', { name: /créer mon compte/i }).click();
}

test.describe('Inscription et vérification de l’email', () => {
	test('C1 · inscription puis code de vérification : accès au tableau de démarrage', async ({ page }) => {
		const email = uniqueEmail('inscription');
		await fillSignup(page, email);
		await expect(page).toHaveURL(/\/auth\/verify-email/, { timeout: 60_000 });
		await expect(page.getByRole('heading', { name: /vérifiez votre adresse email/i })).toBeVisible();

		const user = await db.user.findUniqueOrThrow({ where: { email } });
		expect(user.emailVerified).toBe(false);

		await page.locator('input[name=code]').fill('00000000');
		await page.getByRole('button', { name: /^vérifier$/i }).click();
		await expect(page.getByRole('alert').filter({ hasText: 'Code incorrect.' })).toBeVisible();
		await expect(page).toHaveURL(/verify-email/);

		await page.locator('input[name=code]').fill(await latestVerificationCode(user.id));
		await page.getByRole('button', { name: /^vérifier$/i }).click();
		await expect(page).toHaveURL(/\/auth\/?$/);
		expect((await db.user.findUniqueOrThrow({ where: { email } })).emailVerified).toBe(true);
	});

	test('C2 · un mot de passe sans majuscule ni chiffre est refusé', async ({ page }) => {
		const email = uniqueEmail('faible');
		await fillSignup(page, email, 'motdepassefaible');
		await expect(page).toHaveURL(/\/auth\/signup/);
		expect(await db.user.count({ where: { email } })).toBe(0);
	});

	test('C3 · un email déjà inscrit renvoie vers la connexion', async ({ page }) => {
		const existing = await createUser();
		await fillSignup(page, existing.email);
		await expect(page).toHaveURL(/\/auth\/login\?reason=already_registered/);
	});

	test('C4 · tant que l’email n’est pas vérifié, l’app renvoie vers la vérification', async ({ page, context }) => {
		const user = await createUser({ emailVerified: false });
		await loginAs(context, user.id);
		for (const path of ['/auth', '/auth/subscription', '/auth/photos', '/auth/well-being', '/auth/measurement', '/user']) {
			await page.goto(path);
			await expect(page, `depuis ${path}`).toHaveURL(/\/auth\/verify-email/);
		}
	});
});

test.describe('Messages de compte', () => {
	test('C7 · un envoi d’email en échec n’empêche pas la page ; « Renvoyer le code » affiche son résultat', async ({ page, context }) => {
		const user = await createUser({ emailVerified: false });
		await loginAs(context, user.id);
		await page.goto('/auth/verify-email');
		// Aucun email ne part en e2e : la page s'affiche et annonce l'échec au lieu d'une erreur 500.
		await expect(page.getByRole('alert').filter({ hasText: /l’envoi du code .* a échoué/i })).toBeVisible();
		await page.getByRole('button', { name: /renvoyer le code/i }).click();
		// En e2e aucun email ne part : l'échec d'envoi doit être annoncé (en production : « Un nouveau code… »).
		await expect(page.getByRole('status').filter({ hasText: /l’envoi de l’email a échoué|nouveau code/i })).toBeVisible();
	});

	test('C8 · un email inconnu à la connexion est signalé en français', async ({ page }) => {
		await page.goto('/auth/login');
		await page.locator('input[name=email]').fill(uniqueEmail('inconnu'));
		await page.locator('input[name=password]').fill(DEFAULT_PASSWORD);
		await page.getByRole('button', { name: /continuer/i }).click();
		await expect(page.getByText('Aucun compte avec cet email : créez un compte.')).toBeVisible();
	});

	test('C9 · changement de mot de passe : erreur affichée puis succès, ancienne session fermée', async ({ page, context }) => {
		const user = await createUser({ paid: true });
		await loginAs(context, user.id);
		await page.goto('/auth/account');

		await page.locator('input[name=password]').fill('Mauvais2026x');
		await page.locator('input[name=new_password]').fill('Nouveau2026x');
		await page.locator('form[action="?/password"] button[type=submit]').click();
		await expect(page.getByText('Mot de passe actuel incorrect.')).toBeVisible();

		await page.locator('input[name=password]').fill(DEFAULT_PASSWORD);
		await page.locator('input[name=new_password]').fill('Nouveau2026x');
		await page.locator('form[action="?/password"] button[type=submit]').click();
		await expect(page.getByText('Mot de passe modifié.')).toBeVisible();
		// Les sessions existantes sont fermées, une nouvelle est ouverte pour ce navigateur.
		expect(await db.session.count({ where: { userId: user.id } })).toBe(1);
	});
});

test.describe('Connexion', () => {
	test('C5 · connexion par email et mot de passe, déconnexion', async ({ page }) => {
		const user = await createUser();
		await page.goto('/auth/login');
		await page.locator('input[name=email]').fill(user.email);
		await page.locator('input[name=password]').fill(DEFAULT_PASSWORD);
		await page.getByRole('button', { name: /continuer/i }).click();
		await expect(page).toHaveURL(/\/auth\/?$/);

		await page.getByRole('button', { name: /se déconnecter/i }).click();
		await page.goto('/user');
		await expect(page).toHaveURL(/\/auth\/login/);
	});

	test('C6 · un mauvais mot de passe ne connecte pas', async ({ page }) => {
		const user = await createUser();
		await page.goto('/auth/login');
		await page.locator('input[name=email]').fill(user.email);
		await page.locator('input[name=password]').fill('Mauvais2026');
		await page.getByRole('button', { name: /continuer/i }).click();
		await expect(page.getByText('Email ou mot de passe incorrect.')).toBeVisible();
		expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
	});
});

test.describe('Paiement et accès', () => {
	test('P1 · sans paiement, l’espace et le formulaire renvoient vers la souscription', async ({ page, context }) => {
		const user = await createUser();
		await loginAs(context, user.id);
		for (const path of ['/user', '/auth/photos', '/auth/well-being', '/auth/measurement']) {
			await page.goto(path);
			await expect(page, `depuis ${path}`).toHaveURL(/\/auth\/subscription/);
		}
		await expect(page.getByText(/249,99/).first()).toBeVisible();
	});

	test('P2 · webhook Stripe : transaction payée, 3 mois d’accès, 91 jours nutrition, crédit unique au rejeu', async ({ request }) => {
		const user = await createUser();
		const sessionId = `cs_test_e2e_${user.id}`;

		const first = await sendCheckoutCompleted(request, { userId: user.id, offerSlugs: ['nutrition', 'sport'], sessionId });
		expect(first.status()).toBe(200);
		const replay = await sendCheckoutCompleted(request, { userId: user.id, offerSlugs: ['nutrition', 'sport'], sessionId });
		expect(replay.status()).toBe(200);

		const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
		expect(await db.transaction.count({ where: { userId: user.id, status: 'paid' } })).toBe(1);
		expect(after.nutritionDaysAllocated).toBe(91);
		const days = (after.subscriptionEndsAt!.getTime() - Date.now()) / 86_400_000;
		expect(days).toBeGreaterThan(85);
		expect(days).toBeLessThan(95);
	});

	test('P3 · offre sport seule : accès ouvert, aucun jour nutrition', async ({ request }) => {
		const user = await createUser();
		await sendCheckoutCompleted(request, { userId: user.id, offerSlugs: ['sport'] });
		const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
		expect(after.nutritionDaysAllocated).toBe(0);
		expect(after.subscriptionEndsAt).not.toBeNull();
	});

	test('P4 · un webhook à la signature invalide est rejeté', async ({ request }) => {
		const user = await createUser();
		const response = await sendCheckoutCompleted(request, { userId: user.id, signature: 't=1,v1=signature-fausse' });
		expect(response.status()).toBe(400);
		expect(await db.transaction.count()).toBe(0);
	});

	test('P5 · code d’accès : accès à vie ; un code inconnu est refusé', async ({ page, context }) => {
		const user = await createUser();
		await db.redemptionCode.create({ data: { code: 'BIENVENUE2026' } });
		await loginAs(context, user.id);

		await page.goto('/auth/subscription');
		await page.locator('input[name=code]').fill('INCONNU');
		await page.getByRole('button', { name: /valider le code/i }).click();
		await expect(page.getByText(/invalide ou a déjà été utilisé/i)).toBeVisible();

		await page.locator('input[name=code]').fill('bienvenue2026');
		await page.getByRole('button', { name: /valider le code/i }).click();
		await expect(page).toHaveURL(/\/auth\/?$/);
		const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
		expect(after.subscriptionEndsAt).toBeNull();
		expect((await db.redemptionCode.findUniqueOrThrow({ where: { code: 'BIENVENUE2026' } })).usedByUserId).toBe(user.id);
	});
});

test.describe('Formulaire de démarrage', () => {
	test('D1 · mensurations obligatoires avant de quitter l’étape Morphologie', async ({ page, context }) => {
		const user = await createUser({ paid: true });
		await loginAs(context, user.id);
		await goToMorphologyStep(page);
		await page.getByRole('button', { name: /^continuer$/i }).click();
		await expect(page.getByText(/remplir toutes les mensurations obligatoires/i)).toBeVisible();
		await expect(page.getByRole('heading', { name: /^morphologie$/i })).toBeVisible();
	});

	test('D3 · une valeur invalide d’une étape précédente : message, retour à l’étape, puis enregistrement après correction', async ({ page, context }) => {
		const user = await createUser({ paid: true });
		await loginAs(context, user.id);

		await completeOnboardingWizard(page, { bodyFatPercent: '90' });

		await expect(page.getByText(/masse grasse : 70 au maximum/i)).toBeVisible();
		await expect(page.getByRole('heading', { name: /^morphologie$/i })).toBeVisible();
		expect(await db.bodyMeasurement.count({ where: { userId: user.id } })).toBe(0);

		// La notification recouvre le bas de l'écran sur mobile : attendre qu'elle se ferme
		// (le survol la maintient ouverte, d'où le curseur écarté).
		await page.mouse.move(0, 0);
		await expect(page.getByText(/masse grasse : 70 au maximum/i)).toBeHidden({ timeout: 15_000 });
		await page.locator('input[name=bodyFatPercent]').fill('25');
		for (let i = 0; i < 5; i++) await page.getByRole('button', { name: /^continuer$/i }).click();
		await page.getByRole('button', { name: /^enregistrer$/i }).click();
		await expect(page).toHaveURL(/\/auth\/?$/, { timeout: 60_000 });
		expect(await db.bodyMeasurement.count({ where: { userId: user.id } })).toBe(1);
	});

	test('D2 · formulaire complet : profil enregistré, programme daté, cadencier généré, espace ouvert', async ({ page, context }) => {
		test.setTimeout(240_000);
		await seedRecipeCatalog();
		const user = await createUser({ paid: true });
		await db.user.update({ where: { id: user.id }, data: { nutritionDaysAllocated: 91 } });
		await loginAs(context, user.id);

		await completeOnboardingWizard(page);
		await expect(page).toHaveURL(/\/auth\/?$/, { timeout: 60_000 });

		const measurement = await db.bodyMeasurement.findFirstOrThrow({ where: { userId: user.id } });
		expect(measurement).toMatchObject({ age: 35, heightCm: 178, weightKg: 82 });
		expect(await db.progressPhoto.count({ where: { userId: user.id, month: 0 } })).toBe(3);

		// La génération tourne après la réponse : on attend le cadencier complet.
		await expect
			.poll(() => db.nutritionDay.count({ where: { userId: user.id } }), { timeout: 90_000 })
			.toBe(91);
		expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).programStartDate).not.toBeNull();

		await page.goto('/user');
		await expect(page).toHaveURL(/\/user\/?$/);
	});
});
