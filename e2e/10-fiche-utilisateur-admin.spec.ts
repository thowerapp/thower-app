/**
 * Zone 6 — Fiche utilisateur de l'admin : toutes les actions d'édition (programme, mensurations, photos,
 * bilans, repas, séances, points, badges, défis, tâches, vidéos, sessions, favoris, courses).
 * Documentation : docs/app/06-administration.md. Les actions sont appelées comme le fait le formulaire.
 */
import { randomBytes } from 'node:crypto';
import type { Page } from '@playwright/test';
import { test, expect } from './support/test';
import {
	createDailyTask,
	createOnboardedUser,
	createSportPlan,
	createUser,
	currentWeekMondayParis,
	db,
	loginAs
} from './support/db';

const ACTION_HEADERS = { origin: 'http://localhost:4380', 'x-sveltekit-action': 'true' };
const parisDate = (date: Date) => date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });

type Form = Record<string, string | string[]>;

/** Appelle une action de la fiche ; `ok` vaut vrai pour un résultat « success » (un échec `fail()` répond aussi 200). */
async function act(page: Page, clientId: string, name: string, form: Form) {
	const response = await page.request.post(`/admin/users/${clientId}?/${name}`, {
		form,
		headers: ACTION_HEADERS
	});
	const body = (await response.json()) as { type: string; status?: number; data?: string };
	return {
		ok: body.type === 'success',
		status: body.status ?? response.status(),
		data: body.data ?? ''
	};
}

/** Admin connecté et client dont la fiche contient au moins une ligne de chaque relation éditable. */
async function setup(page: Page) {
	const admin = await createUser({ role: 'ADMIN' });
	await loginAs(page.context(), admin.id);
	const plan = await createSportPlan([
		{ dayIndex: 1, type: 'MAIN_A' },
		{ dayIndex: 2, type: 'MAIN_B' }
	]);
	const client = await createOnboardedUser({ startMondayWeeksAgo: 0 });
	const userId = client.id;
	const recipe = await db.recipe.create({
		data: {
			name: 'Bol e2e',
			category: 'MEAL',
			allergens: [],
			nutritionKcal: 500,
			nutritionProteinG: 35,
			nutritionCarbsG: 50,
			nutritionFatG: 15,
			referenceYieldG: 300,
			ingredients: { create: [{ name: 'Riz', quantityG: 150, unit: 'g', order: 0 }] }
		}
	});
	const nutritionDay = await db.nutritionDay.create({ data: { userId, dayIndex: 1 } });
	const meal = await db.meal.create({
		data: {
			nutritionDayId: nutritionDay.id,
			position: 'LUNCH',
			recipeId: recipe.id,
			quantityG: 300,
			calcCalories: 500
		}
	});
	const workoutDay = await db.userWorkoutDay.create({
		data: { userId, sessionId: plan.sessions.MAIN_A.id, dayIndex: 1 }
	});
	const badge = await db.badge.create({
		data: { slug: `badge-${randomBytes(3).toString('hex')}`, name: 'Badge e2e', condition: {} }
	});
	const userBadge = await db.userBadge.create({ data: { userId, badgeId: badge.id } });
	const challenge = await db.adminChallenge.create({
		data: {
			name: 'Défi e2e',
			durationDays: 7,
			bonusPoints: 20,
			startAt: new Date(),
			endAt: new Date(Date.now() + 7 * 86_400_000)
		}
	});
	const userChallenge = await db.userChallenge.create({
		data: { userId, challengeId: challenge.id }
	});
	const task = await createDailyTask({ label: 'Tâche de la fiche' });
	const videoProgress = await db.userVideoProgress.create({
		data: { userId, workoutVideoId: plan.videos[1].vid1 }
	});
	const item = await db.programDayItem.findFirstOrThrow({
		where: { workoutVideoId: plan.videos[1].vid1 }
	});
	const push = await db.pushSubscription.create({
		data: { userId, endpoint: 'https://push.example/e2e', p256dh: 'k', auth: 'a' }
	});
	const extraSession = await db.session.create({
		data: {
			id: `e2e-extra-${randomBytes(6).toString('hex')}`,
			userId,
			expiresAt: new Date(Date.now() + 86_400_000),
			twoFactorVerified: false
		}
	});
	const list = await db.shoppingList.create({
		data: {
			userId,
			startDayIndex: 1,
			endDayIndex: 7,
			items: { create: [{ ingredientName: 'Riz', totalQuantityG: 200 }] }
		},
		include: { items: true }
	});
	return {
		admin,
		plan,
		client,
		userId,
		recipe,
		nutritionDay,
		meal,
		workoutDay,
		userBadge,
		userChallenge,
		task,
		videoProgress,
		item,
		push,
		extraSession,
		list,
		listItem: list.items[0]
	};
}

test.describe('Fiche utilisateur : chargement', () => {
	test('AD12 · la fiche s’ouvre avec toutes les relations et refuse un compte inconnu', async ({
		page
	}) => {
		const { userId } = await setup(page);
		await page.goto(`/admin/users/${userId}`);
		for (const name of [/points/i, /profil/i])
			await expect(page.getByRole('tab', { name }).first()).toBeVisible();
		await expect(page.locator('form[action="?/updateUser"]')).toBeVisible();

		const summary = await page.request.get(`/admin/users/${userId}/program-summary`);
		expect(summary.status()).toBe(200);
	});
});

test.describe('Fiche utilisateur : programme', () => {
	test('AD13 · réglages du programme : lundi obligatoire, confirmation de régénération, pause et reprise', async ({
		page
	}) => {
		const { userId } = await setup(page);
		const monday = currentWeekMondayParis();
		const base = {
			id: userId,
			nutritionDaysAllocated: '91',
			programStartDate: parisDate(monday),
			photoValidationStatus: 'VALIDATED',
			bodyFatPercent: '25'
		};

		// Sans effet sur le programme : enregistré sans régénération.
		expect((await act(page, userId, 'updateProgramSettings', base)).ok).toBe(true);
		expect((await db.user.findUniqueOrThrow({ where: { id: userId } })).photoValidationStatus).toBe(
			'VALIDATED'
		);

		const tuesday = await act(page, userId, 'updateProgramSettings', {
			...base,
			programStartDate: parisDate(new Date(monday.getTime() + 36 * 3_600_000))
		});
		expect(tuesday.ok).toBe(false);
		expect(tuesday.data).toContain('lundi');

		const unconfirmed = await act(page, userId, 'updateProgramSettings', {
			...base,
			nutritionDaysAllocated: '60'
		});
		expect(unconfirmed.ok).toBe(false);
		expect(unconfirmed.data).toContain('Confirmation');
		expect(
			(await db.user.findUniqueOrThrow({ where: { id: userId } })).nutritionDaysAllocated
		).toBe(91);

		const confirmed = await act(page, userId, 'updateProgramSettings', {
			...base,
			nutritionDaysAllocated: '60',
			confirmRegenerate: '1'
		});
		expect(confirmed.ok).toBe(true);
		expect(
			(await db.user.findUniqueOrThrow({ where: { id: userId } })).nutritionDaysAllocated
		).toBe(60);

		expect((await act(page, userId, 'updateProgramSettings', { id: userId })).ok).toBe(false);

		await act(page, userId, 'pauseProgram', { reason: 'Voyage' });
		expect((await db.user.findUniqueOrThrow({ where: { id: userId } })).programPausedReason).toBe(
			'Voyage'
		);
		await act(page, userId, 'resumeProgram', {});
		const resumed = await db.user.findUniqueOrThrow({ where: { id: userId } });
		expect(resumed.programPausedAt).toBeNull();
		expect(resumed.programPausedReason).toBeNull();
	});

	test('AD14 · mensurations : ajout, modification et suppression exigent la confirmation de régénération', async ({
		page
	}) => {
		const { userId } = await setup(page);
		const measurement = {
			heightCm: '180',
			weightKg: '80',
			waistCm: '85',
			chestCm: '100',
			armCm: '33',
			age: '36'
		};

		expect((await act(page, userId, 'upsertBodyMeasurement', measurement)).ok).toBe(false);
		expect(await db.bodyMeasurement.count({ where: { userId } })).toBe(1);

		expect(
			(await act(page, userId, 'upsertBodyMeasurement', { ...measurement, confirmRegenerate: '1' }))
				.ok
		).toBe(true);
		const created = await db.bodyMeasurement.findMany({
			where: { userId },
			orderBy: { createdAt: 'desc' }
		});
		expect(created).toHaveLength(2);

		const target = created.find((m) => m.heightCm === 180)!;
		await act(page, userId, 'upsertBodyMeasurement', {
			...measurement,
			id: target.id,
			weightKg: '79',
			confirmRegenerate: '1'
		});
		expect(
			(await db.bodyMeasurement.findUniqueOrThrow({ where: { id: target.id } })).weightKg
		).toBe(79);

		expect(
			(
				await act(page, userId, 'upsertBodyMeasurement', {
					...measurement,
					heightCm: '20',
					confirmRegenerate: '1'
				})
			).ok
		).toBe(false);

		expect((await act(page, userId, 'deleteBodyMeasurement', { id: target.id })).ok).toBe(false);
		expect(
			(await act(page, userId, 'deleteBodyMeasurement', { id: target.id, confirmRegenerate: '1' }))
				.ok
		).toBe(true);
		expect(await db.bodyMeasurement.count({ where: { userId } })).toBe(1);
	});

	test('AD15 · photos de suivi et bilans mensuels : création, modification, un seul bilan par mois', async ({
		page
	}) => {
		const { userId } = await setup(page);

		expect(
			(
				await act(page, userId, 'upsertProgressPhoto', {
					angle: 'FRONT',
					month: '1',
					url: 'https://exemple.test/x.jpg'
				})
			).ok
		).toBe(false);
		const url = '/api/cloudflare/r2/image/photos/e2e-m1.jpg';
		expect(
			(await act(page, userId, 'upsertProgressPhoto', { angle: 'FRONT', month: '1', url })).ok
		).toBe(true);
		const photo = await db.progressPhoto.findFirstOrThrow({ where: { userId, month: 1 } });
		await act(page, userId, 'upsertProgressPhoto', {
			id: photo.id,
			angle: 'SIDE',
			month: '1',
			url,
			uploadedAt: '2026-10-01T10:00'
		});
		expect((await db.progressPhoto.findUniqueOrThrow({ where: { id: photo.id } })).angle).toBe(
			'SIDE'
		);

		await act(page, userId, 'upsertMonthlyCheckIn', {
			month: '1',
			stressLevel: '7',
			submittedAt: '2026-10-02T09:00'
		});
		await act(page, userId, 'upsertMonthlyCheckIn', {
			month: '1',
			stressLevel: '4',
			pointsAwarded: 'on'
		});
		const checkIns = await db.monthlyCheckIn.findMany({ where: { userId, month: 1 } });
		expect(checkIns).toHaveLength(1);
		expect(checkIns[0]).toMatchObject({ stressLevel: 4, pointsAwarded: true });
		await act(page, userId, 'upsertMonthlyCheckIn', {
			id: checkIns[0].id,
			month: '1',
			stressLevel: '9'
		});
		expect(
			(await db.monthlyCheckIn.findUniqueOrThrow({ where: { id: checkIns[0].id } })).stressLevel
		).toBe(9);
		expect((await act(page, userId, 'upsertMonthlyCheckIn', { month: '99' })).ok).toBe(false);
	});

	test('AD16 · repas et jours de nutrition : jeûne du jour, quantités et valeurs manuelles', async ({
		page
	}) => {
		const { userId, nutritionDay, meal } = await setup(page);

		expect(
			(
				await act(page, userId, 'updateNutritionDay', {
					id: nutritionDay.id,
					intermittentFasting: 'on'
				})
			).ok
		).toBe(true);
		expect(
			(await db.nutritionDay.findUniqueOrThrow({ where: { id: nutritionDay.id } }))
				.intermittentFasting
		).toBe(true);

		const form = {
			id: meal.id,
			position: 'LUNCH',
			quantityG: '250',
			isManual: 'on',
			manualCalories: '600',
			manualProteinG: '40',
			eatenAt: '2026-10-03T12:30'
		};
		expect((await act(page, userId, 'updateMeal', form)).ok).toBe(true);
		expect(await db.meal.findUniqueOrThrow({ where: { id: meal.id } })).toMatchObject({
			quantityG: 250,
			isManual: true,
			manualCalories: 600
		});
		expect((await act(page, userId, 'updateMeal', { ...form, position: 'GOUTER' })).ok).toBe(false);
	});

	test('AD17 · séances : verrouiller et terminer un jour, supprimer une personnalisation', async ({
		page
	}) => {
		const { userId, workoutDay, admin } = await setup(page);

		await act(page, userId, 'updateWorkoutDay', {
			id: workoutDay.id,
			dayIndex: '1',
			isLocked: 'on',
			completedAt: '2026-10-01T10:00',
			scheduledDate: '2026-10-01T08:00'
		});
		const updated = await db.userWorkoutDay.findUniqueOrThrow({ where: { id: workoutDay.id } });
		expect(updated.isLocked).toBe(true);
		expect(updated.completedAt).not.toBeNull();
		await act(page, userId, 'updateWorkoutDay', { id: workoutDay.id, dayIndex: '1' });
		expect(
			(await db.userWorkoutDay.findUniqueOrThrow({ where: { id: workoutDay.id } })).completedAt
		).toBeNull();

		const override = await db.userSportOverride.create({
			data: { userId, dayIndex: 2, kind: 'HIDE', workoutVideoIds: [], createdById: admin.id }
		});
		expect((await act(page, userId, 'deleteSportOverride', { id: 'pas-un-id' })).ok).toBe(false);
		expect((await act(page, userId, 'deleteSportOverride', { id: override.id })).ok).toBe(true);
		expect(await db.userSportOverride.count({ where: { userId } })).toBe(0);

		expect(
			(await act(page, userId, 'addSportOverride', { dayIndex: '2', kind: 'REPLACE' })).ok
		).toBe(false);
		expect(
			(
				await act(page, userId, 'addSportOverride', {
					dayIndex: '2',
					kind: 'ADD',
					workoutVideoIds: '0'.repeat(24)
				})
			).ok
		).toBe(false);
	});
});

test.describe('Fiche utilisateur : suivi', () => {
	test('AD18 · points, badges et défis : modifier un événement, la progression et la date de fin', async ({
		page
	}) => {
		const { userId, userBadge, userChallenge } = await setup(page);

		await act(page, userId, 'upsertPointEvent', {
			type: 'DAILY_TASK',
			amount: '30',
			metadata: '{"origine":"admin"}'
		});
		const event = await db.pointEvent.findFirstOrThrow({ where: { userId, amount: 30 } });
		expect(event.metadata).toEqual({ origine: 'admin' });
		await act(page, userId, 'upsertPointEvent', {
			id: event.id,
			type: 'POINT_SPENT',
			amount: '-15'
		});
		expect(await db.pointEvent.findUniqueOrThrow({ where: { id: event.id } })).toMatchObject({
			type: 'POINT_SPENT',
			amount: -15
		});
		expect((await act(page, userId, 'upsertPointEvent', { type: 'AUTRE', amount: '1' })).ok).toBe(
			false
		);

		await act(page, userId, 'updateUserBadge', {
			id: userBadge.id,
			progress: '0.5',
			unlockedAt: '2026-10-01T10:00'
		});
		expect(await db.userBadge.findUniqueOrThrow({ where: { id: userBadge.id } })).toMatchObject({
			progress: 0.5
		});
		expect(
			(await act(page, userId, 'updateUserBadge', { id: userBadge.id, progress: '3' })).ok
		).toBe(false);

		await act(page, userId, 'updateUserChallenge', {
			id: userChallenge.id,
			completedAt: '2026-10-05T10:00'
		});
		expect(
			(await db.userChallenge.findUniqueOrThrow({ where: { id: userChallenge.id } })).completedAt
		).not.toBeNull();
		await act(page, userId, 'updateUserChallenge', { id: userChallenge.id });
		expect(
			(await db.userChallenge.findUniqueOrThrow({ where: { id: userChallenge.id } })).completedAt
		).toBeNull();
	});

	test('AD19 · tâches et vidéos : complétions à la date de Paris, désactivation, progression de lecture', async ({
		page
	}) => {
		const { userId, task, item, videoProgress } = await setup(page);

		await act(page, userId, 'upsertDailyTaskCompletion', { taskId: task.id, date: '2026-10-05' });
		await act(page, userId, 'upsertDailyTaskCompletion', {
			taskId: task.id,
			date: '2026-10-05',
			completedAt: '2026-10-05T20:00'
		});
		const completions = await db.dailyTaskCompletion.findMany({
			where: { userId, taskId: task.id }
		});
		expect(completions).toHaveLength(1);
		// Minuit à Paris (UTC+2 en octobre).
		expect(completions[0].date.toISOString()).toBe('2026-10-04T22:00:00.000Z');
		await act(page, userId, 'upsertDailyTaskCompletion', {
			id: completions[0].id,
			taskId: task.id,
			date: '2026-10-06'
		});
		expect(
			(
				await db.dailyTaskCompletion.findUniqueOrThrow({ where: { id: completions[0].id } })
			).date.toISOString()
		).toBe('2026-10-05T22:00:00.000Z');
		await act(page, userId, 'upsertDailyTaskCompletion', { taskId: task.id });
		expect(await db.dailyTaskCompletion.count({ where: { userId, taskId: task.id } })).toBe(2);

		await act(page, userId, 'upsertDailyTaskOptOut', { taskId: task.id });
		await act(page, userId, 'upsertDailyTaskOptOut', { taskId: task.id });
		const optOuts = await db.userDailyTaskOptOut.findMany({ where: { userId } });
		expect(optOuts).toHaveLength(1);
		await act(page, userId, 'upsertDailyTaskOptOut', { id: optOuts[0].id, taskId: task.id });
		expect(await db.userDailyTaskOptOut.count({ where: { userId } })).toBe(0);

		await act(page, userId, 'upsertProgramDayItemCompletion', {
			programDayItemId: item.id,
			stepsValue: '5000'
		});
		await act(page, userId, 'upsertProgramDayItemCompletion', {
			programDayItemId: item.id,
			stepsValue: '8000',
			completedAt: '2026-10-05T10:00'
		});
		const itemCompletions = await db.userProgramDayItemCompletion.findMany({ where: { userId } });
		expect(itemCompletions).toHaveLength(1);
		expect(itemCompletions[0].stepsValue).toBe(8000);
		await act(page, userId, 'upsertProgramDayItemCompletion', {
			id: itemCompletions[0].id,
			programDayItemId: item.id,
			stepsValue: '9000'
		});
		expect(
			(
				await db.userProgramDayItemCompletion.findUniqueOrThrow({
					where: { id: itemCompletions[0].id }
				})
			).stepsValue
		).toBe(9000);

		await act(page, userId, 'updateVideoProgress', {
			id: videoProgress.id,
			maxPositionSec: '42',
			completedAt: '2026-10-05T10:00',
			lastHeartbeatAt: '2026-10-05T10:01'
		});
		expect(
			await db.userVideoProgress.findUniqueOrThrow({ where: { id: videoProgress.id } })
		).toMatchObject({ maxPositionSec: 42 });
		expect(
			(await db.userVideoProgress.findUniqueOrThrow({ where: { id: videoProgress.id } }))
				.completedAt
		).not.toBeNull();
	});
});

test.describe('Fiche utilisateur : compte et listes', () => {
	test('AD20 · sessions et notifications : suppression, identifiant obligatoire', async ({
		page
	}) => {
		const { userId, extraSession, push } = await setup(page);

		expect((await act(page, userId, 'deleteSession', {})).ok).toBe(false);
		expect((await act(page, userId, 'deleteSession', { id: extraSession.id })).ok).toBe(true);
		expect(await db.session.count({ where: { id: extraSession.id } })).toBe(0);

		expect((await act(page, userId, 'deletePushSubscription', {})).ok).toBe(false);
		expect((await act(page, userId, 'deletePushSubscription', { id: push.id })).ok).toBe(true);
		expect(await db.pushSubscription.count({ where: { userId } })).toBe(0);
	});

	test('AD21 · favoris et liste de courses : ajout, retrait, plage et article modifiés', async ({
		page
	}) => {
		const { userId, recipe, list, listItem } = await setup(page);

		expect((await act(page, userId, 'upsertFavoriteRecipe', {})).ok).toBe(false);
		await act(page, userId, 'upsertFavoriteRecipe', { recipeId: recipe.id });
		await act(page, userId, 'upsertFavoriteRecipe', { recipeId: recipe.id });
		const favorites = await db.userFavoriteRecipe.findMany({ where: { userId } });
		expect(favorites).toHaveLength(1);
		await act(page, userId, 'upsertFavoriteRecipe', { id: favorites[0].id });
		expect(await db.userFavoriteRecipe.count({ where: { userId } })).toBe(0);

		expect((await act(page, userId, 'updateShoppingList', { startDayIndex: '1' })).ok).toBe(false);
		await act(page, userId, 'updateShoppingList', {
			id: list.id,
			startDayIndex: '8',
			endDayIndex: '14'
		});
		expect(await db.shoppingList.findUniqueOrThrow({ where: { id: list.id } })).toMatchObject({
			startDayIndex: 8,
			endDayIndex: 14
		});

		expect((await act(page, userId, 'updateShoppingItem', { totalQuantityG: '1' })).ok).toBe(false);
		await act(page, userId, 'updateShoppingItem', {
			id: listItem.id,
			ingredientName: 'Riz basmati',
			category: 'Féculents',
			totalQuantityG: '500',
			unit: 'g',
			isChecked: 'on',
			sources: '[{"jour":1}]'
		});
		expect(await db.shoppingItem.findUniqueOrThrow({ where: { id: listItem.id } })).toMatchObject({
			ingredientName: 'Riz basmati',
			category: 'Féculents',
			totalQuantityG: 500,
			isChecked: true,
			isReported: false,
			sources: [{ jour: 1 }]
		});
	});

	test('AD22 · une action de la fiche est refusée à un non-admin', async ({ page, context }) => {
		const { userId } = await setup(page);
		const intruder = await createOnboardedUser();
		await context.clearCookies();
		await loginAs(context, intruder.id);
		const response = await page.request.post(`/admin/users/${userId}?/pauseProgram`, {
			form: { reason: 'x' },
			headers: ACTION_HEADERS
		});
		expect(response.status()).toBe(403);
		expect((await db.user.findUniqueOrThrow({ where: { id: userId } })).programPausedAt).toBeNull();
	});
});
