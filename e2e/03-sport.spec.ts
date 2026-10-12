/**
 * Zone 3 — Sport : planning hebdomadaire, séances, validation, personnalisation par utilisateur.
 * Documentation : docs/app/03-sport.md.
 *
 * Le programme démarre le lundi de la semaine précédente : la semaine 1 (jours 1 à 7) est entièrement
 * passée, la semaine 2 (jours 8 à 14) est en cours, la semaine 3 (jours 15 à 21) est dans le futur.
 */
import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from './support/test';
import { createOnboardedUser, createSportPlan, db, loginAs } from './support/db';

const WEEK1 = [
	{ dayIndex: 1, type: 'MAIN_A' as const, pre: true },
	{ dayIndex: 3, type: 'MAIN_B' as const },
	{ dayIndex: 5, type: 'MAIN_C' as const }
];

/** Visionnage simulé comme le fait le lecteur : progression jusqu'à la fin de la vidéo. */
async function watch(request: APIRequestContext, videoId: string) {
	const response = await request.post(`/api/videos/workout/${videoId}/progress`, { data: { positionSec: 60, ended: true } });
	expect(response.status()).toBe(200);
}

async function openSession(page: Page, sessionId: string, day: number) {
	await page.goto(`/user/sport/seance/${sessionId}?day=${day}&semaine=${Math.ceil(day / 7)}`);
}

test.describe('Planning', () => {
	test('S1 · la semaine affiche les séances du plan, dans l’ordre 1 → 2 → 3, et la Découverte facultative', async ({ page, context }) => {
		await createSportPlan(WEEK1);
		const user = await createOnboardedUser({ startMondayWeeksAgo: 1 });
		await loginAs(context, user.id);

		await page.goto('/user/sport?semaine=1');
		await expect(page.getByText(/semaine 1 \/ 13/i)).toBeVisible();
		const rows = page.locator('a[href*="/user/sport/seance/"]');
		await expect(rows.filter({ hasText: 'Séance 1 · Jour 1' })).toBeVisible();
		await expect(rows.filter({ hasText: 'Séance 2 · Jour 3' })).toBeVisible();
		await expect(rows.filter({ hasText: 'Séance 3 · Jour 5' })).toBeVisible();
		await expect(page.getByText(/découverte · jour 7/i)).toBeVisible();
		await expect(page.getByText(/séance facultative/i)).toBeVisible();
	});

	test('S2 · déplacer une séance vers un jour libre de la même semaine', async ({ page, context }) => {
		const plan = await createSportPlan(WEEK1);
		const user = await createOnboardedUser({ startMondayWeeksAgo: 1 });
		await loginAs(context, user.id);
		await page.goto('/user/sport?semaine=1');

		const moved = await page.request.post('/user/sport?/moveSession', {
			form: { sourceDayIndex: '3', targetDayIndex: '4' },
			headers: { origin: 'http://localhost:4380', 'x-sveltekit-action': 'true' }
		});
		expect(moved.status()).toBe(200);
		const row = await db.userWorkoutDay.findFirstOrThrow({ where: { userId: user.id, sessionId: plan.sessions.MAIN_B.id } });
		expect(row).toMatchObject({ dayIndex: 4, contentDayIndex: 3 });

		await page.reload();
		await expect(page.locator('a[href*="/user/sport/seance/"]').filter({ hasText: 'Séance 2 · Jour 4' })).toBeVisible();

		const refused = await page.request.post('/user/sport?/moveSession', {
			form: { sourceDayIndex: '4', targetDayIndex: '10' },
			headers: { origin: 'http://localhost:4380', 'x-sveltekit-action': 'true' }
		});
		expect(await refused.text()).toContain('même semaine');
	});

	test('S3 · personnalisation par l’admin : une séance masquée pour un utilisateur seulement', async ({ page, context, browser }) => {
		await createSportPlan(WEEK1);
		const admin = await createOnboardedUser({ role: 'ADMIN', startMondayWeeksAgo: 1 });
		const concerne = await createOnboardedUser({ startMondayWeeksAgo: 1 });
		const autre = await createOnboardedUser({ startMondayWeeksAgo: 1 });
		await db.userSportOverride.create({
			data: { userId: concerne.id, dayIndex: 3, kind: 'HIDE', workoutVideoIds: [], createdById: admin.id, note: 'Genou' }
		});

		await loginAs(context, concerne.id);
		await page.goto('/user/sport?semaine=1');
		await expect(page.locator('a[href*="/user/sport/seance/"]').filter({ hasText: 'Jour 3' })).toHaveCount(0);

		const other = await browser.newContext();
		await loginAs(other, autre.id);
		const otherPage = await other.newPage();
		await otherPage.goto('/user/sport?semaine=1');
		await expect(otherPage.locator('a[href*="/user/sport/seance/"]').filter({ hasText: 'Jour 3' })).toBeVisible();
		await other.close();
	});

	test('S4 · sans l’offre sport, le planning renvoie vers la souscription', async ({ page, context }) => {
		const user = await createOnboardedUser({ offerSlugs: ['nutrition'] });
		await loginAs(context, user.id);
		await page.goto('/user/sport');
		await expect(page).toHaveURL(/\/auth\/subscription\?besoin=sport/);
	});
});

test.describe('Séance', () => {
	test('S5 · validation : vidéos obligatoires vues, +50 points une seule fois, séance verrouillée', async ({ page, context }) => {
		const plan = await createSportPlan(WEEK1);
		const user = await createOnboardedUser({ startMondayWeeksAgo: 1 });
		await loginAs(context, user.id);

		await openSession(page, plan.sessions.MAIN_A.id, 1);
		await expect(page.getByText(/vidéos obligatoires/i).first()).toBeVisible();
		await expect(page.getByRole('button', { name: /valider la séance/i })).toHaveCount(0);
		await expect(page.getByText(/visionne d’abord la vidéo précédente/i)).toBeVisible();

		// La pré-séance est facultative : seules VID1 et VID2 conditionnent la validation.
		await watch(page.request, plan.videos[1].vid1);
		await watch(page.request, plan.videos[1].vid2);
		await page.reload();
		await page.getByRole('button', { name: /valider la séance/i }).click();
		await expect(page.getByText(/séance enregistrée comme terminée/i)).toBeVisible();

		const points = await db.pointEvent.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'asc' } });
		expect(points.filter((p) => p.type === 'WORKOUT_COMPLETE').map((p) => p.amount)).toEqual([50]);
		expect(points.filter((p) => p.type === 'VIDEO_WATCHED').map((p) => p.amount)).toEqual([10, 10]);

		const again = await page.request.post(`/user/sport/seance/${plan.sessions.MAIN_A.id}?/markCompleted`, {
			form: { dayIndex: '1' },
			headers: { origin: 'http://localhost:4380', 'x-sveltekit-action': 'true' }
		});
		expect(await again.text()).toContain('déjà validée');
		expect(await db.pointEvent.count({ where: { userId: user.id, type: 'WORKOUT_COMPLETE' } })).toBe(1);
	});

	test('S6 · ordre 1 → 2 → 3 : la séance 2 attend la validation de la séance 1 de la semaine', async ({ page, context }) => {
		const plan = await createSportPlan(WEEK1);
		const user = await createOnboardedUser({ startMondayWeeksAgo: 1 });
		await loginAs(context, user.id);
		await watch(page.request, plan.videos[3].vid1);
		await watch(page.request, plan.videos[3].vid2);

		await openSession(page, plan.sessions.MAIN_B.id, 3);
		await expect(page.getByText(/valide la séance 1 avant d'accéder à la séance 2/i)).toBeVisible();
		await expect(page.getByRole('button', { name: /valider la séance/i })).toHaveCount(0);
	});

	test('S7 · une séance future se consulte mais ne se valide pas', async ({ page, context }) => {
		const plan = await createSportPlan([...WEEK1, { dayIndex: 15, type: 'MAIN_A' }]);
		const user = await createOnboardedUser({ startMondayWeeksAgo: 1 });
		await loginAs(context, user.id);
		await openSession(page, plan.sessions.MAIN_A.id, 15);
		await expect(page.getByText(/se débloquera à partir du jour 15/i)).toBeVisible();
		await expect(page.getByRole('button', { name: /valider la séance/i })).toHaveCount(0);
	});

	test('S8 · l’API vidéo sport refuse un compte sans l’offre sport', async ({ page, context }) => {
		const plan = await createSportPlan(WEEK1);
		const user = await createOnboardedUser({ offerSlugs: ['nutrition'] });
		await loginAs(context, user.id);
		const response = await page.request.post(`/api/videos/workout/${plan.videos[1].vid1}/progress`, {
			data: { positionSec: 60, ended: true }
		});
		expect(response.status()).toBe(403);
		expect(await db.pointEvent.count()).toBe(0);
	});
});
