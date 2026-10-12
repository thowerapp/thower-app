import { test, expect } from './support/test';
import { createUser, loginAs } from './support/db';

test('la page d’accueil répond', async ({ page }) => {
	const response = await page.goto('/');
	expect(response?.status()).toBe(200);
});

test('un visiteur anonyme est renvoyé vers la connexion depuis son espace', async ({ page }) => {
	await page.goto('/user');
	await expect(page).toHaveURL(/\/auth\/login/);
});

test('un compte connecté accède aux paramètres de son compte', async ({ page, context }) => {
	const user = await createUser();
	await loginAs(context, user.id);
	await page.goto('/auth');
	await expect(page).toHaveURL(/\/auth\/?$/);
});
