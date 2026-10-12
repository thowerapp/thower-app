/**
 * Zone 5 et 6 — API vidéo (progression, jeton de lecture) et webhook Stripe : refus et cas particuliers.
 * Documentation : docs/app/05-decouverte-progression-parametres.md et 06-administration.md.
 */
import { test, expect } from './support/test';
import { createOnboardedUser, db, loginAs, signStripeWebhook } from './support/db';

test.describe('Progression vidéo', () => {
	test('API10 · session, format et offre sport exigés', async ({ page, context }) => {
		const content = await db.discoveryContent.create({
			data: {
				category: 'MOTIVATION',
				title: 'Motivation',
				cloudflareUid: 'cf_e2e_api10',
				status: 'ready'
			}
		});
		const url = `/api/videos/discovery/${content.id}/progress`;
		expect((await page.request.post(url, { data: { positionSec: 1 } })).status()).toBe(401);

		const nutritionOnly = await createOnboardedUser({ offerSlugs: ['nutrition'] });
		await loginAs(context, nutritionOnly.id);
		expect((await page.request.post(url, { data: { positionSec: -5 } })).status()).toBe(400);
		expect((await page.request.post(url, { data: { positionSec: 'abc' } })).status()).toBe(400);
		expect((await page.request.post(url, { data: { positionSec: 1 } })).status()).toBe(200);

		const workout = `/api/videos/workout/${content.id}/progress`;
		expect((await page.request.post(workout, { data: { positionSec: 1 } })).status()).toBe(403);
		expect(
			(await page.request.get(`/api/videos/workout/${content.id}/playback-token`)).status()
		).toBe(403);
	});

	test('API11 · une vidéo rattachée à la tâche du jour rapporte les points de la tâche, une seule fois', async ({
		page,
		context
	}) => {
		const content = await db.discoveryContent.create({
			data: {
				category: 'MOTIVATION',
				title: 'Vidéo du jour',
				cloudflareUid: 'cf_e2e_api11',
				status: 'ready'
			}
		});
		const task = await db.dailyTask.create({
			data: {
				label: 'Regarder la vidéo',
				points: 15,
				active: true,
				type: 'VIDEO',
				discoveryContentId: content.id
			}
		});
		const user = await createOnboardedUser();
		await loginAs(context, user.id);
		const url = `/api/videos/discovery/${content.id}/progress`;

		const first = await page.request.post(url, { data: { positionSec: 30, ended: true } });
		expect((await first.json()).completedNow).toBe(true);
		const points = await db.pointEvent.findMany({ where: { userId: user.id } });
		expect(points.map((p) => p.amount)).toEqual([15]);
		expect(
			await db.dailyTaskCompletion.count({ where: { userId: user.id, taskId: task.id } })
		).toBe(1);

		expect(
			(await (await page.request.post(url, { data: { positionSec: 30, ended: true } })).json())
				.completedNow
		).toBe(false);
		expect(await db.pointEvent.count({ where: { userId: user.id } })).toBe(1);
	});
});

test.describe('Webhook Stripe', () => {
	test('API12 · signature absente refusée, événements sans effet acquittés', async ({ page }) => {
		const missing = await page.request.post('/api/webhooks', { data: '{}' });
		expect(missing.status()).toBe(400);

		for (const type of ['payment_intent.succeeded', 'charge.succeeded', 'customer.created']) {
			const payload = JSON.stringify({
				id: `evt_${type}`,
				object: 'event',
				type,
				data: { object: {} }
			});
			const response = await page.request.post('/api/webhooks', {
				data: payload,
				headers: {
					'stripe-signature': signStripeWebhook(payload),
					'content-type': 'application/json'
				}
			});
			expect(response.status(), type).toBe(200);
			expect(await response.json()).toEqual({ received: true });
		}
		expect(await db.transaction.count()).toBe(0);
	});
});
