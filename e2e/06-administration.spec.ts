/**
 * Zone 6 — Administration : accès, codes, tâches, recettes, utilisateurs, programme sport, ventes.
 * Documentation : docs/app/06-administration.md.
 */
import { test, expect, newIsolatedContext } from './support/test';
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
		const userContext = await newIsolatedContext(browser);
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

test.describe('Fiche utilisateur', () => {
	test('AD9 · onglet Compte : identité, rôle, abonnement et mot de passe modifiés par l’admin', async ({ page, context }) => {
		const admin = await createUser({ role: 'ADMIN' });
		const client = await createUser({ paid: true });
		const other = await createUser();
		await loginAs(context, admin.id);
		await page.goto(`/admin/users/${client.id}`);

		const form = page.locator('form[action="?/updateUser"]');
		await form.getByPlaceholder('Optionnel').first().fill('Nom modifié');
		await form.locator('input[type=password]').fill('Nouveau2026x!');
		await form.locator('input[type=datetime-local]').fill('2027-03-15T10:00');
		await form.getByRole('button', { name: /^client$/i }).first().click();
		// Le menu s'ouvre hors de l'écran sur mobile : on le commande au clavier.
		await page.getByRole('menuitem', { name: 'ADMIN' }).focus();
		await page.keyboard.press('Enter');
		await form.getByRole('button', { name: /^enregistrer$/i }).click();

		await expect.poll(async () => (await db.user.findUniqueOrThrow({ where: { id: client.id } })).username).toBe('Nom modifié');
		const saved = await db.user.findUniqueOrThrow({ where: { id: client.id } });
		expect(saved.role).toBe('ADMIN');
		expect(saved.subscriptionEndsAt?.toISOString().slice(0, 10)).toBe('2027-03-15');
		expect(saved.passwordHash).toMatch(/^\$argon2/);

		// Le nouveau mot de passe ouvre une session.
		const fresh = await newIsolatedContext(page.context().browser()!);
		const freshPage = await fresh.newPage();
		await freshPage.goto('/auth/login');
		await freshPage.locator('input[name=email]').fill(client.email);
		await freshPage.locator('input[name=password]').fill('Nouveau2026x!');
		await freshPage.getByRole('button', { name: /continuer/i }).click();
		await expect(freshPage).toHaveURL(/\/auth\/?$/);
		await fresh.close();

		// Un email déjà pris par un autre compte est refusé (après l'enregistrement, l'app revient à la liste).
		await expect(page).toHaveURL(/\/admin\/users\/?$/);
		await page.goto(`/admin/users/${client.id}`);
		await form.locator('input[type=email]').fill(other.email);
		await form.getByRole('button', { name: /^enregistrer$/i }).click();
		await expect(page.getByText(/email déjà utilisé/i).first()).toBeVisible();
		expect((await db.user.findUniqueOrThrow({ where: { id: client.id } })).email).toBe(client.email);
	});

	test('AD10 · onglet Points : un événement ajouté par l’admin entre dans le total de l’utilisateur', async ({ page, context }) => {
		const admin = await createUser({ role: 'ADMIN' });
		const client = await createOnboardedUser({ dayIndex: 5 });
		await loginAs(context, admin.id);
		await page.goto(`/admin/users/${client.id}`);
		await page.getByRole('tab', { name: /points/i }).click();

		const add = page.locator('form[action="?/upsertPointEvent"]').first();
		await add.locator('input[name=amount]').fill('120');
		await add.getByRole('button', { name: /ajouter un événement/i }).dispatchEvent('click');
		await expect.poll(() => db.pointEvent.count({ where: { userId: client.id, amount: 120 } })).toBe(1);

		const clientContext = await newIsolatedContext(page.context().browser()!);
		await loginAs(clientContext, client.id);
		const clientPage = await clientContext.newPage();
		await clientPage.goto('/user/progression');
		await expect(clientPage.locator('.ph-kv').first()).toHaveText('120');
		await clientContext.close();
	});

	test('AD11 · onglet Profil : allergènes et objectif de perte enregistrés', async ({ page, context }) => {
		const admin = await createUser({ role: 'ADMIN' });
		const client = await createOnboardedUser({ dayIndex: 5 });
		await loginAs(context, admin.id);
		page.on('dialog', (dialog) => void dialog.accept());
		await page.goto(`/admin/users/${client.id}`);
		await page.getByRole('tab', { name: /profil/i }).click();

		await page.getByRole('tab', { name: /santé & profil/i }).click();
		const form = page.locator('form[action="?/updateProfile"]');
		await form.locator('input[name=allergens]').fill('poisson, oeufs');
		await form.locator('input[name=weightLossGoalKg]').fill('7.5');
		await form.getByRole('button', { name: /enregistrer le profil/i }).click();

		await expect
			.poll(async () => (await db.userProfile.findUniqueOrThrow({ where: { userId: client.id } })).allergens)
			.toEqual(['poisson', 'oeufs']);
		expect((await db.userProfile.findUniqueOrThrow({ where: { userId: client.id } })).weightLossGoalKg).toBe(7.5);
	});
});
