/**
 * Zone 6 — Calendrier et résumé du programme d'un utilisateur côté admin : cocher un repas ou une séance,
 * export JSON du programme, et accès réservé aux admins.
 * Documentation : docs/app/06-administration.md.
 */
import { test, expect } from './support/test';
import { createOnboardedUser, createSportPlan, createUser, db, loginAs } from './support/db';

const ORIGIN = { origin: 'http://localhost:4380' };

test.describe('Calendrier de la fiche utilisateur', () => {
	test('AD32 · cocher ou décocher un repas pour l’utilisateur', async ({ page, context }) => {
		const admin = await createUser({ role: 'ADMIN' });
		const client = await createOnboardedUser();
		const day = await db.nutritionDay.create({ data: { userId: client.id, dayIndex: 1 } });
		const meal = await db.meal.create({ data: { nutritionDayId: day.id, position: 'LUNCH' } });
		await loginAs(context, admin.id);
		const url = `/admin/users/${client.id}/calendar/complete-meal`;
		const post = (data: unknown) => page.request.post(url, { data, headers: ORIGIN });

		expect((await post({ eaten: true })).status()).toBe(400);
		expect((await post({ mealId: meal.id })).status()).toBe(400);
		expect((await post({ mealId: '000000000000000000000000', eaten: true })).status()).toBe(404);
		expect(
			(
				await page.request.post(url, {
					data: 'pas du json',
					headers: { ...ORIGIN, 'content-type': 'application/json' }
				})
			).status()
		).toBe(400);

		expect(await (await post({ mealId: meal.id, eaten: true })).json()).toEqual({
			ok: true,
			eaten: true
		});
		expect((await db.meal.findUniqueOrThrow({ where: { id: meal.id } })).eatenAt).not.toBeNull();
		await post({ mealId: meal.id, eaten: false });
		expect((await db.meal.findUniqueOrThrow({ where: { id: meal.id } })).eatenAt).toBeNull();
	});

	test('AD33 · cocher ou décocher la séance d’un jour pour l’utilisateur', async ({
		page,
		context
	}) => {
		const plan = await createSportPlan([{ dayIndex: 1, type: 'MAIN_A' }]);
		const admin = await createUser({ role: 'ADMIN' });
		const client = await createOnboardedUser();
		const workoutDay = await db.userWorkoutDay.create({
			data: { userId: client.id, sessionId: plan.sessions.MAIN_A.id, dayIndex: 1 }
		});
		await loginAs(context, admin.id);
		const url = `/admin/users/${client.id}/calendar/complete-workout`;
		const post = (data: unknown) => page.request.post(url, { data, headers: ORIGIN });

		expect((await post({ completed: true })).status()).toBe(400);
		expect((await post({ dayIndex: 0, completed: true })).status()).toBe(400);
		expect((await post({ dayIndex: 91, completed: true })).status()).toBe(400);
		expect((await post({ dayIndex: 5, completed: true })).status()).toBe(404);

		expect(await (await post({ dayIndex: 1, completed: true })).json()).toEqual({
			ok: true,
			completed: true
		});
		expect(
			(await db.userWorkoutDay.findUniqueOrThrow({ where: { id: workoutDay.id } })).completedAt
		).not.toBeNull();
		await post({ dayIndex: 1, completed: false });
		expect(
			(await db.userWorkoutDay.findUniqueOrThrow({ where: { id: workoutDay.id } })).completedAt
		).toBeNull();
	});

	test('AD34 · le résumé du programme liste les jours de sport et de nutrition de l’utilisateur', async ({
		page,
		context
	}) => {
		const plan = await createSportPlan([{ dayIndex: 1, type: 'MAIN_A' }]);
		const admin = await createUser({ role: 'ADMIN' });
		const client = await createOnboardedUser();
		await db.userWorkoutDay.create({
			data: {
				userId: client.id,
				sessionId: plan.sessions.MAIN_A.id,
				dayIndex: 1,
				completedAt: new Date('2026-10-01T10:00:00Z')
			}
		});
		const recipe = await db.recipe.create({
			data: {
				name: 'Bol résumé',
				category: 'MEAL',
				allergens: [],
				nutritionKcal: 400,
				referenceYieldG: 300
			}
		});
		const day = await db.nutritionDay.create({ data: { userId: client.id, dayIndex: 2 } });
		await db.meal.create({
			data: { nutritionDayId: day.id, position: 'DINNER', recipeId: recipe.id }
		});
		await loginAs(context, admin.id);

		const response = await page.request.get(`/admin/users/${client.id}/program-summary`);
		expect(response.status()).toBe(200);
		expect(response.headers()['content-disposition']).toContain(`programme-${client.id}-91j.json`);
		const { days } = (await response.json()) as {
			days: {
				dayIndex: number;
				sport: { session: { name: string }; completedAt: string | null } | null;
				nutrition: { meals: { position: string; recipe: { name: string } | null }[] };
			}[];
		};
		expect(days).toHaveLength(91);
		expect(days[0].sport).toEqual({
			session: { name: 'Séance 1' },
			completedAt: '2026-10-01T10:00:00.000Z'
		});
		expect(days[1].sport).toBeNull();
		expect(days[1].nutrition.meals).toEqual([
			{ position: 'DINNER', recipe: { name: 'Bol résumé' } }
		]);

		expect(
			(await page.request.get('/admin/users/000000000000000000000000/program-summary')).status()
		).toBe(404);
	});

	test('AD35 · ces trois adresses sont réservées aux admins : un client ne lit ni ne modifie le programme d’un autre', async ({
		page,
		context
	}) => {
		const victim = await createOnboardedUser();
		const day = await db.nutritionDay.create({ data: { userId: victim.id, dayIndex: 1 } });
		const meal = await db.meal.create({ data: { nutritionDayId: day.id, position: 'LUNCH' } });
		const intruder = await createOnboardedUser();
		await loginAs(context, intruder.id);

		expect((await page.request.get(`/admin/users/${victim.id}/program-summary`)).status()).toBe(
			403
		);
		expect(
			(
				await page.request.post(`/admin/users/${victim.id}/calendar/complete-meal`, {
					data: { mealId: meal.id, eaten: true },
					headers: ORIGIN
				})
			).status()
		).toBe(403);
		expect(
			(
				await page.request.post(`/admin/users/${victim.id}/calendar/complete-workout`, {
					data: { dayIndex: 1, completed: true },
					headers: ORIGIN
				})
			).status()
		).toBe(403);
		expect((await db.meal.findUniqueOrThrow({ where: { id: meal.id } })).eatenAt).toBeNull();

		await context.clearCookies();
		expect((await page.request.get(`/admin/users/${victim.id}/program-summary`)).status()).toBe(
			401
		);
	});
});
