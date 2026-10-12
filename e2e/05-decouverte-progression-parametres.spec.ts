/**
 * Zone 5 — Découverte, progression et paramètres.
 * Documentation : docs/app/05-decouverte-progression-parametres.md.
 */
import { test, expect } from './support/test';
import { createDailyTask, createOnboardedUser, db, loginAs } from './support/db';

async function localVideo(category: 'MOTIVATION' | 'MEDITATION' | 'MINDSET' | 'BREATHWORK' | 'EXPLICATION', title: string) {
	return db.discoveryContent.create({
		data: { category, title, cloudflareUid: `local:/videos/${title.replace(/\W+/g, '-')}.mp4`, status: 'ready' }
	});
}

/** Fin de lecture simulée sur le lecteur local (la vidéo n'existe pas en test). */
async function finishLocalVideo(page: import('@playwright/test').Page) {
	await page.locator('video').evaluate((v) => v.dispatchEvent(new Event('ended')));
}

test.describe('Découverte', () => {
	test('V1 · les bibliothèques comptent leurs vidéos visibles', async ({ page, context }) => {
		await localVideo('MOTIVATION', 'Motivation libre');
		await localVideo('MEDITATION', 'Méditation libre');
		await localVideo('MEDITATION', 'Méditation du soir');
		const user = await createOnboardedUser();
		await loginAs(context, user.id);
		await page.goto('/user/decouverte');
		await expect(page.locator('a[href="/user/decouverte/meditation"]')).toContainText('2 vidéos');
		await expect(page.locator('a[href="/user/decouverte/motivation"]')).toContainText('1 vidéo');
	});

	test('V2 · une vidéo rattachée à un jour du programme se débloque ce jour-là', async ({ page, context }) => {
		const tard = await localVideo('MOTIVATION', 'Motivation jour 30');
		await localVideo('MOTIVATION', 'Motivation libre');
		const program = await db.program.create({ data: { active: true } });
		const day30 = await db.programDay.create({ data: { programId: program.id, dayIndex: 30 } });
		await db.programDayItem.create({ data: { programDayId: day30.id, type: 'VIDEO_OF_DAY', discoveryContentId: tard.id } });

		const avant = await createOnboardedUser({ dayIndex: 10 });
		await loginAs(context, avant.id);
		await page.goto('/user/decouverte/motivation');
		await expect(page.getByText('Motivation libre')).toBeVisible();
		await expect(page.getByText('Motivation jour 30')).toHaveCount(0);

		const apres = await createOnboardedUser({ dayIndex: 30 });
		await context.clearCookies();
		await loginAs(context, apres.id);
		await page.goto('/user/decouverte/motivation');
		await expect(page.getByText('Motivation jour 30')).toBeVisible();
	});

	test('V3 · regarder une vidéo jusqu’au bout : « Vidéo regardée », 10 points une seule fois', async ({ page, context }) => {
		const video = await localVideo('BREATHWORK', 'Cohérence cardiaque');
		const user = await createOnboardedUser();
		await loginAs(context, user.id);

		await page.goto(`/user/decouverte/breathwork/${video.id}`);
		await expect(page.getByText(/sera marquée comme regardée/i)).toBeVisible();
		await finishLocalVideo(page);
		await expect(page.getByText('Vidéo regardée')).toBeVisible();
		await expect(page.getByText('+10 pts gagnés')).toBeVisible();

		await page.reload();
		await expect(page.getByText('Vidéo regardée')).toBeVisible();
		await finishLocalVideo(page);
		expect((await db.pointEvent.findMany({ where: { userId: user.id } })).map((p) => p.amount)).toEqual([10]);
	});

	test('V4 · une vidéo liée à la tâche « vidéo » du jour coche la tâche et rapporte ses points', async ({ page, context }) => {
		const video = await localVideo('MEDITATION', 'Méditation du jour');
		const task = await db.dailyTask.create({
			data: { label: 'Regarder la méditation', type: 'VIDEO', discoveryContentId: video.id, points: 25, active: true }
		});
		const user = await createOnboardedUser();
		await loginAs(context, user.id);

		await page.goto(`/user/decouverte/meditation/${video.id}`);
		await finishLocalVideo(page);
		await expect(page.getByText('+25 pts gagnés')).toBeVisible();
		expect(await db.dailyTaskCompletion.count({ where: { userId: user.id, taskId: task.id } })).toBe(1);
		expect((await db.pointEvent.findMany({ where: { userId: user.id } })).map((p) => p.amount)).toEqual([25]);
	});
});

test.describe('Progression', () => {
	test('R1 · jour du programme, points et barème réel', async ({ page, context }) => {
		const user = await createOnboardedUser({ dayIndex: 40 });
		await db.pointEvent.create({ data: { userId: user.id, type: 'WORKOUT_COMPLETE', amount: 50 } });
		await loginAs(context, user.id);
		await page.goto('/user/progression');
		await expect(page.getByText(/jour 40 \/ 91/i)).toBeVisible();
		const bareme = page.locator('.u-li').filter({ hasText: 'Vidéo regardée' });
		await expect(bareme).toContainText('+10 pts');
		await expect(page.locator('.u-li').filter({ hasText: 'Séance validée' })).toContainText('+50 pts');
	});

	test('R3 · niveau et statut : part des points possibles obtenus (tâches actives des jours écoulés + bilans)', async ({ page, context }) => {
		await createDailyTask({ label: 'Tâche e2e', points: 10 });
		// Jour 40, mois 2 : 40 jours × 10 points de tâche + 1 bilan mensuel (50) = 450 points possibles.
		const user = await createOnboardedUser({ dayIndex: 40 });
		await loginAs(context, user.id);

		const cases = [
			{ points: 0, name: 'Gland de chêne', level: 1, percent: 0 },
			{ points: 387, name: 'Éponge molle', level: 2, percent: 86 },
			{ points: 405, name: 'Bambou Furieux', level: 3, percent: 90 },
			{ points: 450, name: 'Titan Légendaire', level: 6, percent: 100 }
		];
		for (const { points, name, level, percent } of cases) {
			await db.pointEvent.deleteMany({ where: { userId: user.id } });
			if (points > 0) await db.pointEvent.create({ data: { userId: user.id, type: 'WORKOUT_COMPLETE', amount: points } });
			await page.goto('/user/progression');
			await expect(page.locator('.ph-level'), `${points} points`).toHaveText(name);
			await expect(page.locator('.ph-level-num')).toHaveText(`Niveau ${level}`);
			await expect(page.locator('.ph-cursor-label')).toHaveText(`${percent}%`);
		}
	});

	test('R2 · bilan mensuel du mois 2 : enregistré, 50 points, une seule fois', async ({ page, context }) => {
		const user = await createOnboardedUser({ dayIndex: 40 });
		await loginAs(context, user.id);
		await page.goto('/user/progression');
		await expect(page.getByText(/mois 2 · à compléter/i)).toBeVisible();
		for (const name of ['stressLevel', 'sleepQuality', 'bodyConfidence', 'digestionQuality', 'happinessLevel', 'readinessToChange']) {
			await page.locator(`input[name=${name}]`).fill('7');
		}
		await page.getByRole('button', { name: /soumettre le check-in/i }).click();
		await expect(page.getByText(/check-in soumis ! \+50 points/i)).toBeVisible();

		const checkIn = await db.monthlyCheckIn.findFirstOrThrow({ where: { userId: user.id } });
		expect(checkIn).toMatchObject({ month: 2, stressLevel: 7 });
		expect(await db.pointEvent.count({ where: { userId: user.id, type: 'MONTHLY_CHECKIN' } })).toBe(1);

		const again = await page.request.post('/user/progression?/submitMonthlyCheckIn', {
			form: { stressLevel: '5', sleepQuality: '5', bodyConfidence: '5', digestionQuality: '5', happinessLevel: '5', readinessToChange: '5' },
			headers: { origin: 'http://localhost:4380', 'x-sveltekit-action': 'true' }
		});
		expect(await again.text()).toContain('déjà soumis');
		expect(await db.pointEvent.count({ where: { userId: user.id, type: 'MONTHLY_CHECKIN' } })).toBe(1);
	});
});

test.describe('Paramètres', () => {
	test('P1 · le profil reprend les mensurations ; une tâche désactivée disparaît de la checklist', async ({ page, context }) => {
		const tache = await createDailyTask({ label: 'Douche froide' });
		await createDailyTask({ label: 'Boire 2 litres d’eau' });
		const user = await createOnboardedUser({ dayIndex: 12 });
		await loginAs(context, user.id);

		await page.goto('/user/parametres/profil');
		await expect(page.getByText('82kg')).toBeVisible();
		await expect(page.getByText(/jour 12/i)).toBeVisible();
		await page.locator('summary').filter({ hasText: /checklist journalière/i }).click();
		await page.locator('form[action="?/toggleTaskOptOut"] button').filter({ hasText: 'Douche froide' }).click();
		await expect(page.getByText('1 / 2 actives')).toBeVisible();
		await expect.poll(() => db.userDailyTaskOptOut.count({ where: { userId: user.id, taskId: tache.id } })).toBe(1);

		await page.goto('/user');
		await expect(page.getByRole('button', { name: /douche froide/i })).toHaveCount(0);
	});

	test('P2 · « Abonnement » mène à la souscription ; « Se déconnecter » ferme la session', async ({ page, context }) => {
		const user = await createOnboardedUser();
		await loginAs(context, user.id);
		await page.goto('/user/parametres');
		await expect(page.locator('a', { hasText: 'Abonnement' })).toHaveAttribute('href', '/auth/subscription');
		await page.getByRole('button', { name: /se déconnecter/i }).click();
		await page.goto('/user');
		await expect(page).toHaveURL(/\/auth\/login/);
	});

	test('P3 · la page d’accès expiré renvoie à l’espace si l’accès est valide', async ({ page, context }) => {
		const user = await createOnboardedUser();
		await loginAs(context, user.id);
		await page.goto('/acces-expire');
		await expect(page).toHaveURL(/\/user\/?$/);
	});
});
