/** Gestes réutilisables des parcours e2e (formulaires, services simulés). */
import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { db, signStripeWebhook } from './db';

/** Upload photo simulé : aucun appel à Cloudflare R2, URL au format attendu par le formulaire. */
export async function mockPhotoUploads(page: Page): Promise<void> {
	let n = 0;
	await page.route('**/api/cloudflare/r2/upload', (route) =>
		route.fulfill({ json: { url: `/api/cloudflare/r2/image/photos/e2e-${++n}.jpg` } })
	);
	await page.route('**/api/cloudflare/r2/image/**', (route) =>
		route.fulfill({ contentType: 'image/jpeg', body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) })
	);
}

/** Catalogue de recettes du seed : la génération du cadencier a de quoi planifier. */
export async function seedRecipeCatalog(): Promise<void> {
	const { RECIPE_CATALOG_DEFS } = (await import('../../src/lib/server/seed/recipeCatalogDefs.js')) as {
		RECIPE_CATALOG_DEFS: Array<Record<string, unknown> & { ingredients: object[] }>;
	};
	for (const { ingredients, ...recipe } of RECIPE_CATALOG_DEFS) {
		await db.recipe.create({
			data: { ...(recipe as never), active: true, isCustom: false, ingredients: { create: ingredients as never } }
		});
	}
}

export const MEASUREMENTS = { age: '35', heightCm: '178', weightKg: '82', bodyFatPercent: '25', waistCm: '90', chestCm: '100', armCm: '33' };

/** Formulaire de démarrage jusqu'à l'étape Morphologie (vidéos, photos simulées, bienvenue). */
export async function goToMorphologyStep(page: Page): Promise<void> {
	await mockPhotoUploads(page);
	await page.goto('/auth/measurement?new=1');
	await page.getByRole('button', { name: /voir la deuxième vidéo/i }).click();
	await page.getByRole('button', { name: /passer aux photos/i }).click();
	for (const id of ['front-photo-input', 'side-photo-input', 'back-photo-input']) {
		await page.locator(`#${id}`).setInputFiles({ name: `${id}.jpg`, mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) });
	}
	// Attendre la fin des trois envois : une photo encore en cours renverrait à cette étape à l'enregistrement.
	await expect(page.locator('.uploaded-pill')).toHaveCount(3);
	await page.getByRole('button', { name: /^continuer$/i }).click();
	await page.getByRole('button', { name: /^commencer$/i }).click();
}

/** Formulaire de démarrage (10 étapes) : présentation, photos, morphologie, puis « Continuer » jusqu'à « Enregistrer ». */
export async function completeOnboardingWizard(
	page: Page,
	overrides: Partial<Record<keyof typeof MEASUREMENTS, string>> = {}
): Promise<void> {
	await goToMorphologyStep(page);
	for (const [name, value] of Object.entries({ ...MEASUREMENTS, ...overrides })) {
		await page.locator(`input[name=${name}]`).fill(value);
	}
	// Morphologie → Lifestyle → Santé → Objectifs → Alimentation → Sport & contexte.
	for (let i = 0; i < 5; i++) await page.getByRole('button', { name: /^continuer$/i }).click();
	await page.getByRole('button', { name: /^enregistrer$/i }).click();
}

/** Webhook `checkout.session.completed` signé comme par Stripe (aucun appel à Stripe). */
export async function sendCheckoutCompleted(
	request: APIRequestContext,
	options: { userId: string; offerSlugs?: string[]; sessionId?: string; signature?: string }
) {
	const session = {
		id: options.sessionId ?? `cs_test_e2e_${Date.now()}`,
		object: 'checkout.session',
		payment_status: 'paid',
		status: 'complete',
		amount_total: 24999 * (options.offerSlugs?.length || 2),
		currency: 'eur',
		client_reference_id: options.userId,
		customer_details: { email: 'paiement@test.local', name: 'Testeur' },
		metadata: { userId: options.userId, plan: 'quarterly', offerSlugs: JSON.stringify(options.offerSlugs ?? []) }
	};
	const payload = JSON.stringify({
		id: `evt_e2e_${Date.now()}`,
		object: 'event',
		type: 'checkout.session.completed',
		data: { object: session }
	});
	return request.post('/api/webhooks', {
		data: payload,
		headers: { 'content-type': 'application/json', 'stripe-signature': options.signature ?? signStripeWebhook(payload) }
	});
}

/**
 * Cadencier réel : catalogue de recettes du seed, puis génération par le cron de rattrapage
 * (même code qu'en production), jusqu'à `days` jours générés.
 */
export async function generateNutritionPlan(request: APIRequestContext, userId: string, days = 91): Promise<void> {
	if ((await db.recipe.count()) === 0) await seedRecipeCatalog();
	const response = await request.get('/api/cron/daily-notification', { headers: { authorization: 'Bearer e2e-cron-secret' } });
	expect(response.status()).toBe(200);
	await expect.poll(() => db.nutritionDay.count({ where: { userId } }), { timeout: 90_000 }).toBe(days);
}
