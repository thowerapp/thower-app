/**
 * Espace utilisateur — erreurs et cas limites des actions : planning sport, liste de courses, cadencier,
 * favoris, bilan mensuel. Documentation : docs/app/03-sport.md, 04-nutrition.md et 05-decouverte-progression-parametres.md.
 */
import type { Page } from '@playwright/test';
import { test, expect } from './support/test';
import { createOnboardedUser, createSportPlan, db, loginAs } from './support/db';
import { generateNutritionPlan } from './support/flows';

const ACTION_HEADERS = { origin: 'http://localhost:4380', 'x-sveltekit-action': 'true' };

async function post(page: Page, url: string, form: Record<string, string> = {}) {
	const response = await page.request.post(url, { form, headers: ACTION_HEADERS });
	const body = (await response.json()) as { type: string; status?: number; data?: string };
	return { type: body.type, status: body.status ?? response.status(), data: body.data ?? '' };
}

test.describe('Sport', () => {
	test('USR1 · déplacer une séance : jours invalides, hors plage, identiques, autre semaine ou sans séance refusés', async ({
		page,
		context
	}) => {
		await createSportPlan([
			{ dayIndex: 1, type: 'MAIN_A' },
			{ dayIndex: 3, type: 'MAIN_B' }
		]);
		const user = await createOnboardedUser({
			startMondayWeeksAgo: 1,
			offerSlugs: ['sport'],
			nutritionDaysAllocated: 0
		});
		await loginAs(context, user.id);
		const move = (source: string, target: string) =>
			post(page, '/user/sport?/moveSession', { sourceDayIndex: source, targetDayIndex: target });

		expect(await move('a', '2')).toMatchObject({ type: 'failure', status: 400 });
		expect(await move('0', '2')).toMatchObject({ type: 'failure', status: 400 });
		expect(await move('1', '92')).toMatchObject({ type: 'failure', status: 400 });
		expect((await move('1', '1')).data).toContain('cible différent');
		expect((await move('1', '9')).data).toContain('même semaine');
		expect((await move('5', '6')).data).toContain('Aucune séance sur le jour source');
	});

	test('USR2 · démarrer le programme sport : la date de départ est posée une seule fois', async ({
		page,
		context
	}) => {
		const user = await createOnboardedUser({ offerSlugs: ['sport'], nutritionDaysAllocated: 0 });
		await db.user.update({ where: { id: user.id }, data: { programStartDate: null } });
		await loginAs(context, user.id);

		expect((await post(page, '/user/sport?/startProgram')).type).toBe('success');
		const started = (await db.user.findUniqueOrThrow({ where: { id: user.id } })).programStartDate;
		expect(started).not.toBeNull();
		expect(await post(page, '/user/sport?/startProgram')).toMatchObject({
			type: 'failure',
			status: 409
		});
		expect(
			(await db.user.findUniqueOrThrow({ where: { id: user.id } })).programStartDate?.getTime()
		).toBe(started?.getTime());
	});
});

test.describe('Nutrition', () => {
	test('USR3 · liste de courses : régénération sur un jour, trois jours, la semaine ou un nombre de jours', async ({
		page,
		request,
		context
	}) => {
		const user = await createOnboardedUser({ dayIndex: 3 });
		await loginAs(context, user.id);
		await generateNutritionPlan(request, user.id);
		const regenerate = (form: Record<string, string>) =>
			post(page, '/user/nutrition/courses?/regenerate', form);

		for (const form of [
			{ periode: 'jour' },
			{ periode: '3jours' },
			{ periode: 'semaine' },
			{ periode: 'inconnue' },
			{ days: '5' },
			{ days: 'abc' },
			{ days: '500' },
			{}
		]) {
			expect((await regenerate(form)).type, JSON.stringify(form)).toBe('success');
		}
		const lists = await db.shoppingList.findMany({
			where: { userId: user.id },
			include: { items: true }
		});
		expect(lists.length).toBeGreaterThan(0);
		expect(lists.some((list) => list.items.length > 0)).toBe(true);

		await db.user.update({ where: { id: user.id }, data: { nutritionDaysAllocated: 0 } });
		expect((await regenerate({ periode: 'jour' })).data).toContain(
			'Aucun jour de programme alloué'
		);
	});

	test('USR4 · jeûne : jour invalide ou sans cadencier refusé ; le jeûne du matin se règle pour tous les jours', async ({
		page,
		context
	}) => {
		const user = await createOnboardedUser({ dayIndex: 3 });
		await loginAs(context, user.id);
		const day = (dayIndex: string, active = 'true') =>
			post(page, '/user/nutrition/cadencier?/toggleJeuneDay', { dayIndex, active });

		expect(await day('abc')).toMatchObject({ type: 'failure', status: 400 });
		expect(await day('0')).toMatchObject({ type: 'failure', status: 400 });
		expect(await day('92')).toMatchObject({ type: 'failure', status: 400 });
		expect(await day('3')).toMatchObject({ type: 'failure', status: 404 });

		expect(
			(await post(page, '/user/nutrition/cadencier?/toggleJeune', { active: 'true' })).type
		).toBe('success');
		expect(
			(await db.userProfile.findUniqueOrThrow({ where: { userId: user.id } }))
				.intermittentFastingMorning
		).toBe(true);
		await post(page, '/user/nutrition/cadencier?/toggleJeune', { active: 'false' });
		expect(
			(await db.userProfile.findUniqueOrThrow({ where: { userId: user.id } }))
				.intermittentFastingMorning
		).toBe(false);
	});

	test('USR5 · favoris depuis la liste des recettes : ajout, retrait, identifiant obligatoire', async ({
		page,
		context
	}) => {
		const recipe = await db.recipe.create({
			data: {
				name: 'Bol favori',
				category: 'MEAL',
				allergens: [],
				nutritionKcal: 400,
				referenceYieldG: 300
			}
		});
		const user = await createOnboardedUser();
		await loginAs(context, user.id);
		const toggle = (form: Record<string, string>) =>
			post(page, '/user/nutrition/recettes?/toggleFavorite', form);

		expect(await toggle({ action: 'add' })).toMatchObject({ type: 'failure', status: 400 });
		expect((await toggle({ recipeId: recipe.id, action: 'add' })).type).toBe('success');
		expect(
			await db.userFavoriteRecipe.count({ where: { userId: user.id, recipeId: recipe.id } })
		).toBe(1);
		expect((await toggle({ recipeId: recipe.id, action: 'remove' })).type).toBe('success');
		expect(await db.userFavoriteRecipe.count({ where: { userId: user.id } })).toBe(0);
	});
});

test.describe('Progression', () => {
	test('USR6 · bilan mensuel : données invalides, programme non démarré ou à venir refusés ; photos facultatives enregistrées', async ({
		page,
		context
	}) => {
		const valid = {
			stressLevel: '6',
			sleepQuality: '6',
			bodyConfidence: '6',
			digestionQuality: '6',
			happinessLevel: '6',
			readinessToChange: '6'
		};
		const submit = (form: Record<string, string>) =>
			post(page, '/user/progression?/submitMonthlyCheckIn', form);

		const notStarted = await createOnboardedUser();
		await db.user.update({ where: { id: notStarted.id }, data: { programStartDate: null } });
		await loginAs(context, notStarted.id);
		expect(await submit({ ...valid, stressLevel: '99' })).toMatchObject({
			type: 'failure',
			status: 400
		});
		expect((await submit(valid)).data).toContain('Programme non démarré');

		const future = await createOnboardedUser({ dayIndex: 0 });
		await context.clearCookies();
		await loginAs(context, future.id);
		expect((await submit(valid)).data).toContain('pas encore démarré');

		const started = await createOnboardedUser({ dayIndex: 40 });
		await context.clearCookies();
		await loginAs(context, started.id);
		const photo = (angle: string) => `/api/cloudflare/r2/image/photos/${started.id}/${angle}.jpg`;
		const done = await submit({
			...valid,
			frontUrl: photo('front'),
			sideUrl: photo('side'),
			backUrl: photo('back')
		});
		expect(done.type).toBe('success');
		const photos = await db.progressPhoto.findMany({
			where: { userId: started.id, month: { gt: 0 } }
		});
		expect(photos.map((p) => p.angle).sort()).toEqual(['BACK', 'FRONT', 'SIDE']);
	});
});
