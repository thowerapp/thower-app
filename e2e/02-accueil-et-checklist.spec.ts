/**
 * Zone 2 — Accueil de l'espace et checklist du jour.
 * Documentation : docs/app/02-accueil-et-checklist.md.
 */
import { test, expect } from './support/test';
import { createDailyTask, createOnboardedUser, createUser, db, loginAs } from './support/db';
import { todayStartParis } from '../src/lib/utils/programDay';

test.describe('Accueil', () => {
	test('A1 · affiche le jour du programme et les accès Sport et Nutrition', async ({ page, context }) => {
		const user = await createOnboardedUser({ dayIndex: 3 });
		await loginAs(context, user.id);
		await page.goto('/user');
		await expect(page.getByText('Jour 3 / 91').first()).toBeVisible();
		const cards = page.locator('a.u-scard');
		await expect(cards.filter({ has: page.locator('.u-scard-lbl', { hasText: 'Sport' }) })).toHaveAttribute('href', '/user/sport');
		await expect(cards.filter({ has: page.locator('.u-scard-lbl', { hasText: 'Nutrition' }) })).toHaveAttribute('href', '/user/nutrition');
	});

	test('A2 · programme pas encore démarré : bandeau d’attente, pas de checklist', async ({ page, context }) => {
		await createDailyTask({ label: 'Boire 2 litres d’eau' });
		const user = await createOnboardedUser({ dayIndex: 0 });
		await loginAs(context, user.id);
		await page.goto('/user');
		await expect(page.getByText('Le programme démarre lundi')).toBeVisible();
		await expect(page.getByText(/checklist du jour/i)).toHaveCount(0);
	});

	test('A3 · offre Sport seule : la carte Nutrition invite à souscrire', async ({ page, context }) => {
		const user = await createOnboardedUser({ offerSlugs: ['sport'], nutritionDaysAllocated: 0 });
		await loginAs(context, user.id);
		await page.goto('/user');
		const nutrition = page.locator('a.u-scard').filter({ has: page.locator('.u-scard-lbl', { hasText: 'Nutrition' }) });
		await expect(nutrition).toHaveAttribute('href', '/auth/subscription');
		await expect(nutrition).toContainText(/non inclus/i);
	});

	test('A4 · abonnement expiré : l’espace renvoie vers la page d’accès expiré', async ({ page, context }) => {
		const user = await createOnboardedUser({ subscriptionEndsAt: new Date(Date.now() - 86_400_000) });
		await loginAs(context, user.id);
		await page.goto('/user');
		await expect(page).toHaveURL(/\/acces-expire/);
	});
});

test.describe('Checklist du jour', () => {
	test('K1 · cocher puis valider : points crédités, date du jour (Paris), habitudes verrouillées', async ({ page, context }) => {
		const eau = await createDailyTask({ label: 'Boire 2 litres d’eau', points: 10, order: 1 });
		await createDailyTask({ label: 'Marcher 8000 pas', points: 15, order: 2 });
		const user = await createOnboardedUser();
		await loginAs(context, user.id);

		await page.goto('/user');
		const validate = page.getByRole('button', { name: /valider les habitudes/i });
		await expect(validate).toBeDisabled();
		await page.getByRole('button', { name: /boire 2 litres/i }).click();
		await validate.click();
		await expect(page.getByText(/habitudes validées/i)).toBeVisible();

		const completions = await db.dailyTaskCompletion.findMany({ where: { userId: user.id } });
		expect(completions).toHaveLength(1);
		expect(completions[0].taskId).toBe(eau.id);
		expect(completions[0].date.toISOString()).toBe(todayStartParis().toISOString());
		const points = await db.pointEvent.findMany({ where: { userId: user.id, type: 'DAILY_TASK' } });
		expect(points.map((p) => p.amount)).toEqual([10]);

		await page.reload();
		await expect(page.getByText('Validée ✓')).toBeVisible();
		await expect(page.getByRole('button', { name: /marcher 8000 pas/i })).toBeDisabled();
	});

	test('K2 · la checklist de la page Journée partage la même validation', async ({ page, context }) => {
		await createDailyTask({ label: 'Méditer 5 minutes', points: 20 });
		const user = await createOnboardedUser();
		await loginAs(context, user.id);
		await page.goto('/user/journee');
		await page.getByRole('button', { name: /méditer 5 minutes/i }).click();
		await page.getByRole('button', { name: /valider les habitudes/i }).click();
		await expect(page.getByText(/habitudes validées/i)).toBeVisible();

		await page.goto('/user');
		await expect(page.getByText('Validée ✓')).toBeVisible();
		expect(await db.pointEvent.count({ where: { userId: user.id } })).toBe(1);
	});

	test('K3 · une tâche n’apparaît que dans sa fenêtre de jours (showFromDay / showUntilDay)', async ({ page, context }) => {
		await createDailyTask({ label: 'Tâche de la semaine 1', showFromDay: 1, showUntilDay: 7 });
		await createDailyTask({ label: 'Tâche du mois 2', showFromDay: 31 });
		const user = await createOnboardedUser({ dayIndex: 3 });
		await loginAs(context, user.id);
		await page.goto('/user');
		await expect(page.getByRole('button', { name: /tâche de la semaine 1/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /tâche du mois 2/i })).toHaveCount(0);
	});

	test('K4 · une tâche désactivée dans les paramètres n’est plus proposée', async ({ page, context }) => {
		const ignoree = await createDailyTask({ label: 'Prendre une douche froide' });
		await createDailyTask({ label: 'Boire 2 litres d’eau' });
		const user = await createOnboardedUser();
		await db.userDailyTaskOptOut.create({ data: { userId: user.id, taskId: ignoree.id } });
		await loginAs(context, user.id);
		await page.goto('/user');
		await expect(page.getByRole('button', { name: /boire 2 litres/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /douche froide/i })).toHaveCount(0);
	});
});

test.describe('Garde-fous d’écriture', () => {
	test('K5 · un compte sans paiement ne peut pas valider la checklist par un envoi direct', async ({ page, context }) => {
		const task = await createDailyTask({ label: 'Boire 2 litres d’eau' });
		const user = await createUser();
		await loginAs(context, user.id);
		const response = await page.request.post('/user?/validateChecklist', {
			form: { taskIds: task.id },
			headers: { origin: 'http://localhost:4380', 'x-sveltekit-action': 'true' }
		});
		expect(response.status()).toBe(403);
		expect(await db.pointEvent.count()).toBe(0);
	});

	test('K6 · un abonnement expiré ne peut pas non plus écrire', async ({ page, context }) => {
		const task = await createDailyTask({ label: 'Boire 2 litres d’eau' });
		const user = await createOnboardedUser({ subscriptionEndsAt: new Date(Date.now() - 86_400_000) });
		await loginAs(context, user.id);
		const response = await page.request.post('/user/journee?/validateChecklist', {
			form: { taskIds: task.id },
			headers: { origin: 'http://localhost:4380', 'x-sveltekit-action': 'true' }
		});
		expect(response.status()).toBe(403);
		expect(await db.dailyTaskCompletion.count()).toBe(0);
	});

	test('K7 · un compte sans paiement n’obtient pas de jeton vidéo Découverte', async ({ page, context }) => {
		const content = await db.discoveryContent.create({
			data: { category: 'MOTIVATION', title: 'Motivation', cloudflareUid: 'cf_e2e_motivation', status: 'ready' }
		});
		const user = await createUser();
		await loginAs(context, user.id);
		const response = await page.request.get(`/api/videos/discovery/${content.id}/playback-token`);
		expect(response.status()).toBe(403);
	});
});
