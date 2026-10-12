/**
 * API : notifications push (abonnement, clé publique, envoi par le cron), géocodage, statut des photos,
 * stockage des photos (R2), envoi vidéo de démonstration. Les services externes sont joués par le faux serveur.
 * Documentation : docs/app/05-decouverte-progression-parametres.md et 06-administration.md.
 */
import { createECDH, randomBytes } from 'node:crypto';
import { test, expect } from './support/test';
import { createOnboardedUser, createUser, db, loginAs } from './support/db';
import { fakes } from './support/fakes';

const CRON = { authorization: 'Bearer e2e-cron-secret' };
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);

/** Clés d'abonnement valides (courbe P-256 et secret d'authentification de 16 octets) : le contenu est chiffré pour de vrai. */
function pushKeys() {
	const ecdh = createECDH('prime256v1');
	ecdh.generateKeys();
	return {
		p256dh: ecdh.getPublicKey().toString('base64url'),
		auth: randomBytes(16).toString('base64url')
	};
}

test.describe('Notifications push', () => {
	test('API1 · abonnement : session, JSON et champs obligatoires ; un même appareil n’est enregistré qu’une fois', async ({
		page,
		context
	}) => {
		const keys = pushKeys();
		const body = { endpoint: 'https://push.fake.test/device-1', keys };
		expect((await page.request.post('/api/push-subscribe', { data: body })).status()).toBe(401);

		const user = await createUser();
		await loginAs(context, user.id);
		const invalid = await page.request.post('/api/push-subscribe', {
			data: 'pas du json',
			headers: { 'content-type': 'application/json' }
		});
		expect(invalid.status()).toBe(400);
		expect(
			(
				await page.request.post('/api/push-subscribe', {
					data: { endpoint: 'https://push.fake.test/x' }
				})
			).status()
		).toBe(400);

		expect((await page.request.post('/api/push-subscribe', { data: body })).status()).toBe(200);
		const next = pushKeys();
		expect(
			(await page.request.post('/api/push-subscribe', { data: { ...body, keys: next } })).status()
		).toBe(200);
		const rows = await db.pushSubscription.findMany({ where: { userId: user.id } });
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			endpoint: body.endpoint,
			p256dh: next.p256dh,
			auth: next.auth
		});
	});

	test('API2 · la clé publique Web Push est publiée', async ({ page }) => {
		const response = await page.request.get('/api/push-vapid-public');
		expect(response.status()).toBe(200);
		expect(((await response.json()) as { publicKey: string }).publicKey).toMatch(/^B[\w-]{86}$/);
	});

	test('API3 · le cron exige son secret, envoie le rappel à chaque abonné et compte les échecs', async ({
		page
	}) => {
		const user = await createUser();
		await db.pushSubscription.create({
			data: { userId: user.id, endpoint: 'https://push.fake.test/send/1', ...pushKeys() }
		});

		expect((await page.request.get('/api/cron/daily-notification')).status()).toBe(401);
		expect(
			(
				await page.request.get('/api/cron/daily-notification', {
					headers: { authorization: 'Bearer faux' }
				})
			).status()
		).toBe(401);

		const ok = await page.request.get('/api/cron/daily-notification', { headers: CRON });
		expect(await ok.json()).toMatchObject({ ok: true, sent: 1, failed: 0, total: 1 });
		const requests = await fakes.push.requests();
		expect(requests).toHaveLength(1);
		expect(requests[0].path).toBe('/push/send/1');

		await fakes.push.status(410);
		const gone = await page.request.get('/api/cron/daily-notification', { headers: CRON });
		expect(await gone.json()).toMatchObject({ sent: 0, failed: 1, total: 1 });
	});

	test('API4 · sans abonné, le cron l’indique et rattrape tout de même les générations', async ({
		page
	}) => {
		const response = await page.request.get('/api/cron/daily-notification', { headers: CRON });
		const body = (await response.json()) as {
			total: number;
			message?: string;
			generation: unknown;
		};
		expect(body.total).toBe(0);
		expect(body.message).toMatch(/aucun abonnement push/i);
		expect(body.generation).toBeDefined();
	});
});

test.describe('Géocodage et statut des photos', () => {
	test('API5 · recherche d’adresse : session requise, critère obligatoire, suggestions, aucun résultat', async ({
		page,
		context
	}) => {
		expect((await page.request.get('/api/adresse?q=test')).status()).toBe(401);

		const user = await createOnboardedUser();
		await loginAs(context, user.id);
		expect((await page.request.get('/api/adresse')).status()).toBe(400);

		await fakes.geocodage.results([
			{
				label: '10 Rue de Test 75001 Paris',
				name: '10 Rue de Test',
				postcode: '75001',
				city: 'Paris',
				context: '75, Paris, Île-de-France'
			}
		]);
		const found = await page.request.get('/api/adresse?q=10%20rue%20de%20test');
		expect(found.status()).toBe(200);
		expect(await found.json()).toEqual({
			suggestions: [
				{
					label: '10 Rue de Test 75001 Paris',
					name: '10 Rue de Test',
					postcode: '75001',
					city: 'Paris',
					context: '75, Paris, Île-de-France'
				}
			]
		});

		await fakes.reset();
		expect((await page.request.get('/api/adresse?q=nulle%20part')).status()).toBe(404);
	});

	test('API6 · statut des photos d’inscription : session requise, présence des photos', async ({
		page,
		context
	}) => {
		expect((await page.request.get('/api/check-photo-status')).status()).toBe(401);

		const withPhotos = await createOnboardedUser();
		await loginAs(context, withPhotos.id);
		expect(await (await page.request.get('/api/check-photo-status')).json()).toEqual({
			validated: true,
			hasSignupPhotos: true
		});

		const without = await createUser();
		await context.clearCookies();
		await loginAs(context, without.id);
		expect(await (await page.request.get('/api/check-photo-status')).json()).toEqual({
			validated: true,
			hasSignupPhotos: false
		});
	});
});

test.describe('Stockage des photos (R2)', () => {
	test('API7 · envoi : session, fichier, type et taille contrôlés ; la photo est stockée et rendue à son propriétaire', async ({
		page,
		context
	}) => {
		expect(
			(
				await page.request.post('/api/cloudflare/r2/upload', {
					multipart: { file: { name: 'a.jpg', mimeType: 'image/jpeg', buffer: JPEG } }
				})
			).status()
		).toBe(401);

		const user = await createUser();
		await loginAs(context, user.id);
		expect(
			(
				await page.request.post('/api/cloudflare/r2/upload', { multipart: { autre: 'rien' } })
			).status()
		).toBe(400);
		expect(
			(
				await page.request.post('/api/cloudflare/r2/upload', {
					multipart: { file: { name: 'a.gif', mimeType: 'image/gif', buffer: JPEG } }
				})
			).status()
		).toBe(400);
		const huge = Buffer.alloc(10 * 1024 * 1024 + 1);
		expect(
			(
				await page.request.post('/api/cloudflare/r2/upload', {
					multipart: { file: { name: 'a.jpg', mimeType: 'image/jpeg', buffer: huge } }
				})
			).status()
		).toBe(400);
		expect(await fakes.r2.objects()).toHaveLength(0);

		const ok = await page.request.post('/api/cloudflare/r2/upload', {
			multipart: { file: { name: 'Photo.JPG', mimeType: 'image/jpeg', buffer: JPEG } }
		});
		expect(ok.status()).toBe(200);
		const { key, url } = (await ok.json()) as { key: string; url: string };
		expect(key).toMatch(new RegExp(`^photos/${user.id}/[\\w-]+\\.jpg$`));
		expect(await fakes.r2.objects()).toEqual([{ key, type: 'image/jpeg', size: JPEG.length }]);

		const image = await page.request.get(url);
		expect(image.status()).toBe(200);
		expect(image.headers()['content-type']).toBe('image/jpeg');
		expect(await image.body()).toEqual(JPEG);
	});

	test('API8 · lecture d’une photo : propriétaire ou admin seulement, clé inconnue en 404', async ({
		page,
		context
	}) => {
		const owner = await createUser();
		await loginAs(context, owner.id);
		const upload = await page.request.post('/api/cloudflare/r2/upload', {
			multipart: { file: { name: 'a.png', mimeType: 'image/png', buffer: JPEG } }
		});
		const { url } = (await upload.json()) as { url: string };
		expect(
			(
				await page.request.get('/api/cloudflare/r2/image/photos/' + owner.id + '/inconnue.jpg')
			).status()
		).toBe(404);

		await context.clearCookies();
		expect((await page.request.get(url)).status()).toBe(401);

		const stranger = await createUser();
		await loginAs(context, stranger.id);
		expect((await page.request.get(url)).status()).toBe(403);

		const admin = await createUser({ role: 'ADMIN' });
		await context.clearCookies();
		await loginAs(context, admin.id);
		expect((await page.request.get(url)).status()).toBe(200);
	});
});

test.describe('Envoi vidéo de démonstration', () => {
	test('API9 · en développement, la route de démonstration renvoie une URL d’envoi Cloudflare', async ({
		page
	}) => {
		const response = await page.request.post('/api/cloudflare/stream/upload-url');
		expect(response.status()).toBe(200);
		const body = (await response.json()) as { uploadURL: string; uid: string };
		expect(body.uid).toBeTruthy();
		expect(body.uploadURL).toContain('http');
	});
});
