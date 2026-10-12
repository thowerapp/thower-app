/**
 * Zone 1 — Pages de démarrage accessibles par adresse directe (photos de référence, bien-être) :
 * l'assistant principal est `/auth/measurement`, ces étapes restent atteignables après paiement.
 * Documentation : docs/app/01-compte-et-demarrage.md.
 */
import { test, expect } from './support/test';
import { createUser, db, loginAs } from './support/db';

const ACTION = { origin: 'http://localhost:4380', 'x-sveltekit-action': 'true' };
const PHOTO = '/api/cloudflare/r2/image/photos/e2e.jpg';

async function post(
	page: import('@playwright/test').Page,
	url: string,
	form: Record<string, string>
) {
	const response = await page.request.post(url, { form, headers: ACTION });
	return (await response.json()) as { type: string; status?: number; location?: string };
}

test.describe('Étapes de démarrage isolées', () => {
	test('AUT26 · photos de référence : validation des adresses, trois photos enregistrées, points une seule fois', async ({
		page,
		context
	}) => {
		const user = await createUser({ paid: true });
		await loginAs(context, user.id);
		expect((await page.goto('/auth/photos'))?.status()).toBe(200);

		for (const form of [
			{},
			{ frontUrl: 'https://exemple.test/a.jpg', sideUrl: PHOTO, backUrl: PHOTO },
			{ frontUrl: PHOTO, sideUrl: PHOTO, backUrl: '' }
		]) {
			const refused = await post(page, '/auth/photos?/submitPhotos', form);
			expect(refused).toMatchObject({ type: 'failure', status: 400 });
		}
		expect(await db.progressPhoto.count({ where: { userId: user.id } })).toBe(0);

		const form = { frontUrl: PHOTO, sideUrl: PHOTO, backUrl: PHOTO };
		expect(await post(page, '/auth/photos?/submitPhotos', form)).toMatchObject({
			type: 'redirect',
			location: '/auth/well-being'
		});
		expect(await db.progressPhoto.count({ where: { userId: user.id, month: 0 } })).toBe(3);
		expect(await db.pointEvent.count({ where: { userId: user.id, type: 'PHOTO_UPLOAD' } })).toBe(1);

		await post(page, '/auth/photos?/submitPhotos', form);
		expect(await db.pointEvent.count({ where: { userId: user.id, type: 'PHOTO_UPLOAD' } })).toBe(1);
	});

	test('AUT27 · bien-être : formulaire prérempli, valeurs hors limites refusées, profil enregistré', async ({
		page,
		context
	}) => {
		const user = await createUser({ paid: true });
		await db.userProfile.create({
			data: { userId: user.id, activityLevel: 'ACTIVE', allergens: [], stressLevel: 7 }
		});
		await loginAs(context, user.id);
		expect((await page.goto('/auth/well-being'))?.status()).toBe(200);

		const refused = await post(page, '/auth/well-being', { stressLevel: '11' });
		expect(refused).toMatchObject({ type: 'failure', status: 400 });
		expect(
			(await db.userProfile.findUniqueOrThrow({ where: { userId: user.id } })).stressLevel
		).toBe(7);

		const saved = await post(page, '/auth/well-being', {
			stressLevel: '4',
			sleepQuality: '6',
			bodyConfidence: '5',
			digestionQuality: '8',
			happinessLevel: '9',
			readinessToChange: '10',
			addictionsText: 'café'
		});
		expect(saved).toMatchObject({ type: 'redirect', location: '/auth/measurement?new=1' });
		expect(await db.userProfile.findUniqueOrThrow({ where: { userId: user.id } })).toMatchObject({
			stressLevel: 4,
			sleepQuality: 6,
			bodyConfidence: 5,
			digestionQuality: 8,
			happinessLevel: 9,
			readinessToChange: 10,
			addictionsText: 'café'
		});
	});

	test('AUT28 · ces étapes exigent un email vérifié puis un paiement valide', async ({
		page,
		context
	}) => {
		const unverified = await createUser({ emailVerified: false });
		await loginAs(context, unverified.id);
		for (const path of ['/auth/photos', '/auth/well-being']) {
			await page.goto(path);
			expect(new URL(page.url()).pathname, path).toMatch(/^\/auth\/verify-email/);
		}

		await context.clearCookies();
		const unpaid = await createUser();
		await loginAs(context, unpaid.id);
		for (const path of ['/auth/photos', '/auth/well-being']) {
			await page.goto(path);
			expect(new URL(page.url()).pathname, path).toBe('/auth/subscription');
		}
		expect(await post(page, '/auth/well-being', { stressLevel: '3' })).toMatchObject({
			type: 'redirect',
			location: '/auth/subscription'
		});
		expect(await db.userProfile.count({ where: { userId: unpaid.id } })).toBe(0);
	});
});
