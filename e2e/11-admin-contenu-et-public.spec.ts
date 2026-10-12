/**
 * Zone 6 et pages publiques — contact, sitemap, réglementations ; admin : messages, comptes, tâches, recettes ;
 * Découverte : lecture jusqu'au bout dans chaque bibliothèque.
 * Documentation : docs/app/06-administration.md et 05-decouverte-progression-parametres.md.
 */
import type { Page } from '@playwright/test';
import { test, expect } from './support/test';
import { createDailyTask, createOnboardedUser, createUser, db, loginAs } from './support/db';

const ACTION_HEADERS = { origin: 'http://localhost:4380', 'x-sveltekit-action': 'true' };

async function post(page: Page, url: string, form: Record<string, string>) {
	const response = await page.request.post(url, { form, headers: ACTION_HEADERS });
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

test.describe('Pages publiques', () => {
	test('PUB1 · formulaire de contact : message enregistré, champs invalides refusés, limite de débit', async ({
		page
	}) => {
		await page.goto('/contact');
		await page.locator('input[name=name]').fill('Camille Test');
		await page.locator('input[name=email]').fill('camille@test.local');
		await page.locator('input[name=subject]').fill('Question');
		await page.locator('textarea[name=message]').fill('Bonjour, je voudrais des informations.');
		await page.getByRole('button', { name: /envoyer le message/i }).click();
		await expect(page.getByText(/votre message a bien été envoyé/i)).toBeVisible();
		expect(await db.contact.findFirstOrThrow()).toMatchObject({
			name: 'Camille Test',
			email: 'camille@test.local',
			subject: 'Question'
		});

		// Message trop court : rien n'est enregistré.
		const tooShort = await post(page, '/contact?/submit', {
			name: 'Camille',
			email: 'camille@test.local',
			message: 'court'
		});
		expect(tooShort.type).toBe('failure');
		expect(tooShort.status).toBe(400);
		expect(await db.contact.count()).toBe(1);

		// 5 envois par minute et par adresse : le suivant est refusé.
		const statuses: number[] = [];
		for (let i = 0; i < 6; i++) {
			statuses.push(
				(
					await post(page, '/contact?/submit', {
						name: 'Camille',
						email: 'camille@test.local',
						message: 'Un message assez long.'
					})
				).status
			);
		}
		expect(statuses).toContain(429);
		expect(await db.contact.count()).toBeLessThanOrEqual(5);
	});

	test('PUB2 · le sitemap liste les pages publiques, pas l’admin ni l’authentification', async ({
		page
	}) => {
		const response = await page.request.get('/sitemap.xml');
		expect(response.status()).toBe(200);
		expect(response.headers()['content-type']).toContain('application/xml');
		const xml = await response.text();
		expect(xml).toContain('<loc>https://thower.com/contact</loc>');
		expect(xml).toContain('<loc>https://thower.com/mentions-legales</loc>');
		expect(xml).not.toMatch(/thower\.com\/(admin|auth|api)/);
		expect(xml).not.toContain('[');
	});

	test('PUB3 · la page des réglementations répond', async ({ page }) => {
		const response = await page.goto('/reglementations');
		expect(response?.status()).toBe(200);
		await expect(page.locator('main, body').first()).not.toBeEmpty();
	});
});

test.describe('Admin : messages et comptes', () => {
	test('AD23 · messages de contact : liste, détail, suppression, message inconnu', async ({
		page,
		context
	}) => {
		const first = await db.contact.create({
			data: {
				name: 'Alice Contact',
				email: 'alice@test.local',
				subject: 'Abonnement',
				message: 'Comment résilier mon abonnement ?'
			}
		});
		await db.contact.create({
			data: { name: 'Bob Contact', email: 'bob@test.local', message: 'Merci pour votre aide.' }
		});
		const admin = await createUser({ role: 'ADMIN' });
		await loginAs(context, admin.id);

		await page.goto('/admin/contact');
		await expect(page.getByText('Alice Contact')).toBeVisible();
		await expect(page.getByText('Bob Contact')).toBeVisible();

		await page.goto(`/admin/contact/${first.id}`);
		await expect(page.getByText('Comment résilier mon abonnement ?')).toBeVisible();

		const missing = await page.goto('/admin/contact/000000000000000000000000');
		expect(missing?.status()).toBe(404);

		await post(page, '/admin/contact?/deleteContact', { id: first.id });
		expect(await db.contact.findMany({ select: { name: true } })).toEqual([
			{ name: 'Bob Contact' }
		]);
	});

	test('AD24 · comptes : liste, suppression d’un utilisateur (ses paiements sont conservés sans lui)', async ({
		page,
		context
	}) => {
		const admin = await createUser({ role: 'ADMIN' });
		const client = await createOnboardedUser();
		await db.pointEvent.create({ data: { userId: client.id, type: 'DAILY_TASK', amount: 10 } });
		await loginAs(context, admin.id);

		await page.goto('/admin/users');
		await expect(page.getByText(client.email)).toBeVisible();

		await post(page, '/admin/users?/deleteUser', { id: client.id });
		expect(await db.user.count({ where: { id: client.id } })).toBe(0);
		expect(await db.pointEvent.count({ where: { userId: client.id } })).toBe(0);
		expect(await db.session.count({ where: { userId: client.id } })).toBe(0);
		const payments = await db.transaction.findMany();
		expect(payments).toHaveLength(1);
		expect(payments[0].userId).toBeNull();
		await page.reload();
		await expect(page.getByText(client.email)).toHaveCount(0);
	});

	test('AD25 · tâches quotidiennes : modifier, désactiver, supprimer (avec ses complétions)', async ({
		page,
		context
	}) => {
		const admin = await createUser({ role: 'ADMIN' });
		const client = await createOnboardedUser();
		const task = await createDailyTask({ label: 'Étirements' });
		const other = await createDailyTask({ label: 'À supprimer depuis la liste' });
		await db.dailyTaskCompletion.create({
			data: { userId: client.id, taskId: task.id, date: new Date() }
		});
		await db.userDailyTaskOptOut.create({ data: { userId: client.id, taskId: task.id } });
		await loginAs(context, admin.id);

		await page.goto(`/admin/daily-tasks/${task.id}`);
		await expect(page.locator('input[name=label]')).toHaveValue('Étirements');

		const url = `/admin/daily-tasks/${task.id}`;
		expect(
			(
				await post(page, `${url}?/update`, {
					label: 'Étirements du soir',
					points: '20',
					order: '2',
					type: 'STANDARD',
					active: 'true',
					showFromDay: '3',
					showUntilDay: '10'
				})
			).type
		).toBe('success');
		expect(await db.dailyTask.findUniqueOrThrow({ where: { id: task.id } })).toMatchObject({
			label: 'Étirements du soir',
			points: 20,
			order: 2,
			showFromDay: 3,
			showUntilDay: 10
		});
		expect(
			(await post(page, `${url}?/update`, { label: 'x', showFromDay: '9', showUntilDay: '2' })).type
		).toBe('failure');

		await post(page, `${url}?/toggleActive`, {});
		expect((await db.dailyTask.findUniqueOrThrow({ where: { id: task.id } })).active).toBe(false);
		await post(page, `${url}?/toggleActive`, {});
		expect((await db.dailyTask.findUniqueOrThrow({ where: { id: task.id } })).active).toBe(true);

		await page.goto('/admin/daily-tasks');
		await expect(page.getByText('Étirements du soir')).toBeVisible();
		await expect(page.getByText('J3–10')).toBeVisible();
		expect((await post(page, '/admin/daily-tasks?/deleteTask', {})).type).toBe('failure');
		await post(page, '/admin/daily-tasks?/deleteTask', { id: other.id });
		expect(await db.dailyTask.count({ where: { id: other.id } })).toBe(0);

		const removed = await post(page, `${url}?/delete`, {});
		expect(removed.type).toBe('redirect');
		expect(await db.dailyTask.count({ where: { id: task.id } })).toBe(0);
		expect(await db.dailyTaskCompletion.count({ where: { taskId: task.id } })).toBe(0);
		expect(await db.userDailyTaskOptOut.count({ where: { taskId: task.id } })).toBe(0);
	});

	test('AD26 · recettes : création depuis l’admin, puis suppression', async ({ page, context }) => {
		const admin = await createUser({ role: 'ADMIN' });
		await loginAs(context, admin.id);

		await page.goto('/admin/recettes/create');
		await page.locator('input[name=name]').fill('Bowl e2e admin');
		await page.locator('input[name=nutritionKcal]').fill('550');
		await page.locator('input[name=referenceYieldG]').fill('400');
		await page.getByRole('button', { name: /^ajouter$/i }).click();
		await page.locator('#ing-name-0').fill('Quinoa');
		await page.locator('#ing-qty-0').fill('120');
		await page.locator('#ing-unit-0').fill('g');
		await page.getByRole('button', { name: /créer la recette/i }).click();

		await expect.poll(() => db.recipe.count({ where: { name: 'Bowl e2e admin' } })).toBe(1);
		const recipe = await db.recipe.findFirstOrThrow({
			where: { name: 'Bowl e2e admin' },
			include: { ingredients: true }
		});
		expect(recipe).toMatchObject({ isCustom: false, nutritionKcal: 550, referenceYieldG: 400 });
		expect(recipe.ingredients.map((i) => [i.name, i.quantityG])).toEqual([['Quinoa', 120]]);

		await page.goto('/admin/recettes');
		await expect(page.getByText('Bowl e2e admin')).toBeVisible();
		await post(page, '/admin/recettes?/deleteRecipe', { id: recipe.id });
		expect(await db.recipe.count({ where: { id: recipe.id } })).toBe(0);
	});
});

test.describe('Découverte : chaque bibliothèque', () => {
	for (const [category, slug] of [
		['MOTIVATION', 'motivation'],
		['MINDSET', 'mindset'],
		['EXPLICATION', 'explication'],
		['MEDITATION', 'meditation'],
		['BREATHWORK', 'breathwork']
	] as const) {
		test(`DEC-${slug} · la vidéo vue jusqu’au bout est marquée regardée`, async ({
			page,
			context
		}) => {
			const video = await db.discoveryContent.create({
				data: {
					category,
					title: `Vidéo ${slug}`,
					cloudflareUid: `local:/videos/${slug}.mp4`,
					status: 'ready'
				}
			});
			const user = await createOnboardedUser();
			await loginAs(context, user.id);

			await page.goto(`/user/decouverte/${slug}`);
			await expect(page.getByText(`Vidéo ${slug}`)).toBeVisible();
			await page.goto(`/user/decouverte/${slug}/${video.id}`);
			await page.locator('video').evaluate((v) => v.dispatchEvent(new Event('ended')));
			await expect(page.getByText('Vidéo regardée')).toBeVisible();
			expect(
				await db.userVideoProgress.count({
					where: { userId: user.id, discoveryContentId: video.id, completedAt: { not: null } }
				})
			).toBe(1);
		});
	}
});
