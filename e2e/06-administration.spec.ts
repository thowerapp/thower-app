/**
 * Zone 6 — Administration : accès, codes, tâches, recettes, utilisateurs, programme sport, ventes.
 * Documentation : docs/app/06-administration.md.
 */
import { test, expect } from './support/test';
import { createOnboardedUser, createSportPlan, createUser, db, loginAs } from './support/db';

const ACTION_HEADERS = { origin: 'http://localhost:4380', 'x-sveltekit-action': 'true' };

test.describe('Accès', () => {
	test('AD1 · un compte non admin ne voit pas l’admin et ne peut pas y écrire', async ({ page, context }) => {
		const user = await createOnboardedUser();
		await loginAs(context, user.id);
		await page.goto('/admin');
		await expect(page).not.toHaveURL(/\/admin/);

		const response = await page.request.post('/admin/codes?/generate', { form: { count: '5' }, headers: ACTION_HEADERS });
		expect(response.status()).toBe(403);
		expect(await db.redemptionCode.count()).toBe(0);
	});
});

test.describe('Contenu', () => {
	test('AD2 · générer des codes d’accès à usage unique', async ({ page, context }) => {
		const admin = await createUser({ role: 'ADMIN' });
		await loginAs(context, admin.id);
		await page.goto('/admin/codes');
		await page.locator('input[name=count]').fill('2');
		await page.locator('input[name=note]').fill('Salon e2e');
		await page.getByRole('button', { name: /générer/i }).click();
		await expect(page.getByText(/codes existants \(2\)/i)).toBeVisible();
		const codes = await db.redemptionCode.findMany();
		expect(codes).toHaveLength(2);
		expect(codes.every((c) => c.note === 'Salon e2e' && c.usedByUserId === null)).toBe(true);
	});

	test('AD3 · une tâche créée par l’admin apparaît dans la checklist des utilisateurs', async ({ page, context, browser }) => {
		const admin = await createUser({ role: 'ADMIN' });
		await loginAs(context, admin.id);
		await page.goto('/admin/daily-tasks/create');
		await page.locator('input[name=label]').fill('Respirer 5 minutes');
		await page.locator('input[name=points]').fill('15');
		await page.getByRole('button', { name: /créer la tâche/i }).click();
		await expect.poll(() => db.dailyTask.count({ where: { label: 'Respirer 5 minutes', points: 15, active: true } })).toBe(1);

		const user = await createOnboardedUser();
		const userContext = await browser.newContext();
		await loginAs(userContext, user.id);
		const userPage = await userContext.newPage();
		await userPage.goto('/user');
		await expect(userPage.getByRole('button', { name: /respirer 5 minutes/i })).toBeVisible();
		await userContext.close();
	});

	test('AD4 · enregistrer une recette du catalogue conserve ses allergènes', async ({ page, context }) => {
		const recipe = await db.recipe.create({
			data: {
				name: 'Omelette e2e',
				category: 'MEAL',
				allergens: ['eggs', 'milk'],
				nutritionKcal: 500,
				nutritionProteinG: 35,
				nutritionCarbsG: 20,
				nutritionFatG: 30,
				referenceYieldG: 300,
				ingredients: { create: [{ name: 'Œufs entiers', quantityG: 180, unit: 'g', order: 0 }] }
			}
		});
		const admin = await createUser({ role: 'ADMIN' });
		await loginAs(context, admin.id);
		await page.goto(`/admin/recettes/${recipe.id}`);
		await page.getByRole('button', { name: /enregistrer les modifications/i }).click();

		// Codes anglais du catalogue d'origine convertis, et non plus effacés.
		await expect.poll(async () => (await db.recipe.findUniqueOrThrow({ where: { id: recipe.id } })).allergens.sort()).toEqual(['lait', 'oeufs']);
	});
});

test.describe('Utilisateurs et programme', () => {
	test('AD5 · personnaliser le plan sport d’un utilisateur depuis sa fiche', async ({ page, context }) => {
		await createSportPlan([{ dayIndex: 1, type: 'MAIN_A' }, { dayIndex: 3, type: 'MAIN_B' }]);
		const admin = await createUser({ role: 'ADMIN' });
		const client = await createOnboardedUser({ startMondayWeeksAgo: 1 });
		await loginAs(context, admin.id);
		await page.goto(`/admin/users/${client.id}`);

		const response = await page.request.post(`/admin/users/${client.id}?/addSportOverride`, {
			form: { dayIndex: '3', kind: 'HIDE', note: 'Genou' },
			headers: ACTION_HEADERS
		});
		expect(response.status()).toBe(200);
		const override = await db.userSportOverride.findFirstOrThrow({ where: { userId: client.id } });
		expect(override).toMatchObject({ dayIndex: 3, kind: 'HIDE', createdById: admin.id, note: 'Genou' });
	});

	test('AD6 · le récap sport signale un jour dont aucune vidéo n’est typée', async ({ page, context }) => {
		const plan = await createSportPlan([{ dayIndex: 1, type: 'MAIN_A' }, { dayIndex: 2, type: 'MAIN_B' }]);
		await db.workoutVideo.updateMany({ where: { id: { in: [plan.videos[2].vid1, plan.videos[2].vid2] } }, data: { sessionType: null } });
		const admin = await createUser({ role: 'ADMIN' });
		await loginAs(context, admin.id);
		await page.goto('/admin/videos/programme-sport');
		await expect(page.getByText(/aucune vidéo typée/i)).toBeVisible();
		await expect(page.getByText(/1\s*jours à corriger|jours à corriger/i).first()).toBeVisible();
	});

	test('AD7 · stopper le programme d’un utilisateur avec un motif', async ({ page, context }) => {
		const admin = await createUser({ role: 'ADMIN' });
		const client = await createOnboardedUser();
		await loginAs(context, admin.id);
		await page.goto(`/admin/users/${client.id}`);
		await page.locator('textarea[name=reason]').fill('Blessure au dos');
		await page.getByRole('button', { name: /stopper le programme/i }).click();
		await expect
			.poll(async () => (await db.user.findUniqueOrThrow({ where: { id: client.id } })).programPausedReason)
			.toBe('Blessure au dos');
	});

	test('AD8 · les ventes listent les paiements encaissés', async ({ page, context }) => {
		const admin = await createUser({ role: 'ADMIN' });
		const client = await createOnboardedUser();
		await loginAs(context, admin.id);
		await page.goto('/admin/sales');
		await expect(page.getByText(client.email)).toBeVisible();
	});
});
