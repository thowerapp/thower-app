/**
 * Services externes (faux serveurs locaux) : connexion Google, paiement Stripe, vidéos Cloudflare, PDF.
 * Documentation : docs/app/01-compte-et-demarrage.md (`G`, `X`), docs/app/06-administration.md (`CF`, `PDF`).
 */
import { readFile } from 'node:fs/promises';
import type { Download, Page } from '@playwright/test';
import { test, expect, newIsolatedContext } from './support/test';
import { createOnboardedUser, createUser, db, loginAs, signStreamWebhook, uniqueEmail } from './support/db';
import { E2E_BASE_URL } from './support/config';
import { fakes } from './support/fakes';

const ACTION_HEADERS = { origin: E2E_BASE_URL, 'x-sveltekit-action': 'true' };

async function pdfText(download: Download): Promise<string> {
	const path = await download.path();
	return (await readFile(path)).toString('latin1');
}

/**
 * Parcourt « Se connecter avec Google » : le départ est lu sans suivre la redirection (aucun appel à
 * Google ; les cookies d'état restent dans le navigateur), puis le navigateur est ramené au rappel
 * avec `code` et l'état reçu, comme le ferait Google.
 */
async function googleLogin(page: Page, code: string) {
	const start = await page.request.get('/auth/login/google', { maxRedirects: 0 });
	expect(start.status()).toBe(302);
	const authUrl = new URL(start.headers()['location']);
	expect(authUrl.origin).toBe('https://accounts.google.com');
	expect(authUrl.searchParams.get('client_id')).toBe('e2e');
	expect(authUrl.searchParams.get('scope')).toContain('email');
	const state = authUrl.searchParams.get('state');
	return page.goto(`${E2E_BASE_URL}/auth/login/google/callback?code=${code}&state=${state}`);
}

test.describe('Connexion avec Google', () => {
	test('G1 · première connexion : le compte est créé, vérifié et ouvert', async ({ page }) => {
		const email = uniqueEmail('google');
		await fakes.google.identity('code-g1', { sub: 'google-sub-g1', email, name: 'Gaëlle Google', picture: 'https://img.test/g.png' });
		await googleLogin(page, 'code-g1');

		const user = await db.user.findUniqueOrThrow({ where: { email } });
		expect(user).toMatchObject({ googleId: 'google-sub-g1', emailVerified: true, name: 'Gaëlle Google' });
		expect(await db.session.count({ where: { userId: user.id } })).toBe(1);
		await page.goto('/auth');
		await expect(page).toHaveURL(/\/auth\/?$/);
	});

	test('G2 · un compte existant avec le même email est rattaché à Google, sans doublon', async ({ page }) => {
		const existing = await createUser({ emailVerified: false });
		await fakes.google.identity('code-g2', { sub: 'google-sub-g2', email: existing.email, name: 'Même Personne', picture: 'https://img.test/m.png' });
		await googleLogin(page, 'code-g2');

		expect(await db.user.count({ where: { email: existing.email } })).toBe(1);
		const linked = await db.user.findUniqueOrThrow({ where: { id: existing.id } });
		expect(linked).toMatchObject({ googleId: 'google-sub-g2', emailVerified: true });

		// Le compte est désormais Google : le mot de passe n'ouvre plus de session.
		await page.context().clearCookies();
		await page.goto('/auth/login');
		await page.locator('input[name=email]').fill(existing.email);
		await page.locator('input[name=password]').fill('Thower-e2e-2026');
		await page.getByRole('button', { name: /continuer/i }).click();
		await expect(page.getByText('Ce compte utilise Google : connectez-vous avec Google.').first()).toBeVisible();
	});

	test('G3 · une seconde connexion retrouve le même compte', async ({ page }) => {
		const email = uniqueEmail('retour');
		await fakes.google.identity('code-g3a', { sub: 'google-sub-g3', email, name: 'Retour', picture: 'https://img.test/r.png' });
		await googleLogin(page, 'code-g3a');
		await page.context().clearCookies();
		await fakes.google.identity('code-g3b', { sub: 'google-sub-g3', email, name: 'Retour', picture: 'https://img.test/r.png' });
		await googleLogin(page, 'code-g3b');

		expect(await db.user.count({ where: { googleId: 'google-sub-g3' } })).toBe(1);
		expect(await db.session.count()).toBe(2);
	});

	test('G4 · un rappel falsifié ou refusé par Google ne crée ni compte ni session', async ({ page }) => {
		const noState = await page.request.get('/auth/login/google/callback?code=x&state=y');
		expect(noState.status()).toBe(400);

		// État valide (cookie posé par le départ), mais code inconnu de Google.
		const response = await googleLogin(page, 'refuse');
		expect(response?.status()).toBe(400);
		expect(await db.user.count()).toBe(0);
		expect(await db.session.count()).toBe(0);
	});
});

test.describe('Paiement Stripe (faux serveur)', () => {
	test('X1 · souscription : session créée avec les bonnes offres, retour du checkout, accès ouvert sans webhook', async ({ page, context }) => {
		const user = await createUser();
		await fakes.stripe.autoPay(true);
		await loginAs(context, user.id);
		await page.goto('/auth/subscription');
		await page.getByRole('button', { name: /nutrition/i }).first().click();
		await page.getByRole('button', { name: /commencer — 3 mois/i }).click();

		await expect.poll(() => db.transaction.count({ where: { userId: user.id, status: 'paid' } }), { timeout: 30_000 }).toBe(1);
		const [session] = await fakes.stripe.sessions();
		expect(session.metadata).toMatchObject({ userId: user.id, plan: 'quarterly', offerSlugs: '["nutrition"]' });
		expect(session.client_reference_id).toBe(user.id);
		expect(session.amount_total).toBeGreaterThan(0);

		const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
		expect(after.nutritionDaysAllocated).toBe(91);
		const days = (after.subscriptionEndsAt!.getTime() - Date.now()) / 86_400_000;
		expect(days).toBeGreaterThan(85);
		expect((await db.transaction.findFirstOrThrow({ where: { userId: user.id } })).offerSlugs).toEqual(['nutrition']);
	});

	test('X2 · rejouer le retour du checkout ne crédite qu’une fois', async ({ page, context }) => {
		const user = await createUser();
		await loginAs(context, user.id);
		await fakes.stripe.session({
			id: 'cs_test_x2',
			status: 'complete',
			payment_status: 'paid',
			amount_total: 24999,
			currency: 'eur',
			client_reference_id: user.id,
			metadata: { userId: user.id, plan: 'quarterly', offerSlugs: '["nutrition","sport"]' }
		});
		await page.goto('/auth/subscription?success=1&session_id=cs_test_x2');
		await page.goto('/auth/subscription?success=1&session_id=cs_test_x2');

		expect(await db.transaction.count({ where: { userId: user.id } })).toBe(1);
		expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).nutritionDaysAllocated).toBe(91);
	});

	test('X3 · une session non payée, ou celle d’un autre compte, n’ouvre aucun accès', async ({ page, context }) => {
		const user = await createUser();
		const other = await createUser();
		await loginAs(context, user.id);
		await fakes.stripe.session({
			id: 'cs_test_x3_unpaid',
			status: 'open',
			payment_status: 'unpaid',
			client_reference_id: user.id,
			metadata: { userId: user.id, plan: 'quarterly', offerSlugs: '["sport"]' }
		});
		await fakes.stripe.session({
			id: 'cs_test_x3_other',
			status: 'complete',
			payment_status: 'paid',
			amount_total: 24999,
			client_reference_id: other.id,
			metadata: { userId: other.id, plan: 'quarterly', offerSlugs: '["sport"]' }
		});
		await page.goto('/auth/subscription?success=1&session_id=cs_test_x3_unpaid');
		await page.goto('/auth/subscription?success=1&session_id=cs_test_x3_other');
		await page.goto('/auth/subscription?success=1&session_id=cs_test_inconnue');

		expect(await db.transaction.count()).toBe(0);
		expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).subscriptionEndsAt).toBeNull();
		expect((await db.user.findUniqueOrThrow({ where: { id: other.id } })).subscriptionEndsAt).toBeNull();
	});

	test('X4 · le webhook en retard : le retour sans identifiant retrouve le paiement récent du compte', async ({ page, context }) => {
		const user = await createUser();
		await loginAs(context, user.id);
		await fakes.stripe.session({
			id: 'cs_test_x4',
			status: 'complete',
			payment_status: 'paid',
			amount_total: 24999,
			created: Math.floor(Date.now() / 1000) - 60,
			client_reference_id: user.id,
			metadata: { userId: user.id, plan: 'quarterly', offerSlugs: '["sport"]' }
		});
		await page.goto('/auth/subscription?success=1');
		await expect.poll(() => db.transaction.count({ where: { userId: user.id, status: 'paid' } })).toBe(1);
		expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).subscriptionEndsAt).not.toBeNull();
	});

	test('X5 · un compte payé sans mensurations est rattrapé depuis le formulaire de démarrage', async ({ page, context }) => {
		const user = await createUser();
		await loginAs(context, user.id);
		await fakes.stripe.session({
			id: 'cs_test_x5',
			status: 'complete',
			payment_status: 'paid',
			amount_total: 49998,
			created: Math.floor(Date.now() / 1000) - 30,
			client_reference_id: user.id,
			metadata: { userId: user.id, plan: 'quarterly', offerSlugs: '["nutrition","sport"]' }
		});
		await page.goto('/auth/measurement');
		await expect(page).toHaveURL(/\/auth\/measurement/);
		expect(await db.transaction.count({ where: { userId: user.id, status: 'paid' } })).toBe(1);
	});

	test('X6 · renouvellement : un second paiement ouvre le cycle 2 et prolonge l’accès', async ({ page, context }) => {
		const user = await createOnboardedUser({ dayIndex: 10 });
		const before = await db.user.findUniqueOrThrow({ where: { id: user.id } });
		await loginAs(context, user.id);
		await fakes.stripe.session({
			id: 'cs_test_x6',
			status: 'complete',
			payment_status: 'paid',
			amount_total: 24999,
			client_reference_id: user.id,
			metadata: { userId: user.id, plan: 'quarterly', offerSlugs: '["nutrition"]' }
		});
		await page.goto('/auth/subscription?success=1&session_id=cs_test_x6');

		await expect.poll(async () => (await db.user.findUniqueOrThrow({ where: { id: user.id } })).programCycleStarts.length).toBe(1);
		const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
		expect(after.nutritionDaysAllocated).toBe(before.nutritionDaysAllocated + 91);
		expect(after.subscriptionEndsAt!.getTime()).toBeGreaterThan(before.subscriptionEndsAt!.getTime());
		expect(after.programCycleStarts[0].getTime()).toBeGreaterThan(before.programStartDate!.getTime());
	});
});

test.describe('Vidéos Cloudflare Stream (faux serveur)', () => {
	test('CF1 · le jeton de lecture est signé par Cloudflare ; une vidéo pas prête se resynchronise', async ({ page, context }) => {
		const user = await createUser({ paid: true });
		await loginAs(context, user.id);
		const ready = await db.discoveryContent.create({
			data: { category: 'MOTIVATION', title: 'Prête', cloudflareUid: 'cf-ready', status: 'ready', active: true }
		});
		const response = await page.request.get(`/api/videos/discovery/${ready.id}/playback-token`);
		expect(response.status()).toBe(200);
		expect(await response.json()).toMatchObject({ token: 'signed-cf-ready', embedUrl: 'https://iframe.cloudflarestream.com/signed-cf-ready' });

		// Webhook manqué : la base dit « en cours », Cloudflare dit « prête ».
		const late = await db.discoveryContent.create({
			data: { category: 'MOTIVATION', title: 'En retard', cloudflareUid: 'cf-late', status: 'inprogress', active: true }
		});
		await fakes.cloudflare.videos([{ uid: 'cf-late', status: { state: 'ready' }, duration: 95, thumbnail: 'https://thumb.test/late.jpg' }]);
		expect((await page.request.get(`/api/videos/discovery/${late.id}/playback-token`)).status()).toBe(200);
		expect(await db.discoveryContent.findUniqueOrThrow({ where: { id: late.id } })).toMatchObject({ status: 'ready', durationSeconds: 95 });

		// Toujours en transcodage côté Cloudflare : refus explicite.
		const busy = await db.discoveryContent.create({
			data: { category: 'MOTIVATION', title: 'Occupée', cloudflareUid: 'cf-busy', status: 'inprogress', active: true }
		});
		await fakes.cloudflare.videos([{ uid: 'cf-busy', status: { state: 'inprogress' } }]);
		expect((await page.request.get(`/api/videos/discovery/${busy.id}/playback-token`)).status()).toBe(409);

		// Vidéo de seed : jamais envoyée sur Cloudflare.
		const seed = await db.discoveryContent.create({
			data: { category: 'MOTIVATION', title: 'Seed', cloudflareUid: 'cf_seed_1', status: 'ready', active: true }
		});
		expect((await page.request.get(`/api/videos/discovery/${seed.id}/playback-token`)).status()).toBe(409);
	});

	test('CF2 · webhook Cloudflare : état, durée et vignette mis à jour ; signature fausse refusée', async ({ request }) => {
		const video = await db.workoutVideo.create({
			data: { cloudflareUid: 'cf-hook', title: 'Webhook', position: 'VID1', sessionType: 'MAIN_A', status: 'inprogress' }
		});
		const discovery = await db.discoveryContent.create({
			data: { category: 'MINDSET', title: 'Webhook découverte', cloudflareUid: 'cf-hook-d', status: 'inprogress' }
		});
		const send = (uid: string, signature: string | null, body: object) => {
			const raw = JSON.stringify(body);
			return request.post('/api/cloudflare/stream/webhook', {
				data: raw,
				headers: { 'content-type': 'application/json', ...(signature === 'auto' ? { 'webhook-signature': signStreamWebhook(raw) } : signature ? { 'webhook-signature': signature } : {}) }
			});
		};

		const forged = await send('cf-hook', 'time=1,sig1=faux', { uid: 'cf-hook', status: { state: 'ready' } });
		expect(forged.status()).toBe(401);
		expect((await send('cf-hook', null, { uid: 'cf-hook', status: { state: 'ready' } })).status()).toBe(401);
		expect((await db.workoutVideo.findUniqueOrThrow({ where: { id: video.id } })).status).toBe('inprogress');

		const ok = await send('cf-hook', 'auto', { uid: 'cf-hook', status: { state: 'ready' }, duration: 312.5, thumbnail: 'https://thumb.test/hook.jpg' });
		expect(ok.status()).toBe(200);
		expect(await db.workoutVideo.findUniqueOrThrow({ where: { id: video.id } })).toMatchObject({
			status: 'ready',
			durationSeconds: 312.5,
			thumbnailUrl: 'https://thumb.test/hook.jpg'
		});
		await send('cf-hook-d', 'auto', { uid: 'cf-hook-d', status: { state: 'error' } });
		expect((await db.discoveryContent.findUniqueOrThrow({ where: { id: discovery.id } })).status).toBe('error');
		expect((await send('x', 'auto', { status: { state: 'ready' } })).status()).toBe(400);
	});

	test('CF3 · envoi d’une vidéo : l’admin obtient une URL d’envoi Cloudflare (simple, puis tus au-delà de 200 Mio)', async ({ page, context }) => {
		const admin = await createUser({ role: 'ADMIN' });
		await loginAs(context, admin.id);
		const post = (form: Record<string, string>) => page.request.post('/api/admin/cloudflare-stream/upload-url', { form });

		const simple = await post({ filename: 'seance-1.mp4', maxDurationSeconds: '30' });
		expect(simple.status()).toBe(200);
		expect(await simple.json()).toMatchObject({ uid: expect.stringMatching(/^fake-stream-/), uploadURL: expect.stringContaining('upload.fake.test') });
		const sent = (await fakes.cloudflare.requests()).find((r) => r.path.includes('direct_upload'))!;
		// Durée bornée à 60 s au minimum, lecture signée obligatoire, nom conservé.
		expect(sent.body).toMatchObject({ maxDurationSeconds: 60, requireSignedURLs: true, meta: { name: 'seance-1.mp4', uploadedBy: admin.id } });

		const large = await post({ filename: 'gros.mp4', uploadLength: String(300 * 1024 * 1024) });
		expect(await large.json()).toMatchObject({ uid: expect.stringMatching(/^fake-tus-/) });

		const user = await createUser({ paid: true });
		const userContext = await newIsolatedContext(page.context().browser()!);
		await loginAs(userContext, user.id);
		expect((await userContext.request.post(`${E2E_BASE_URL}/api/admin/cloudflare-stream/upload-url`, { form: { filename: 'x.mp4' }, headers: ACTION_HEADERS })).status()).toBe(403);
		await userContext.close();
	});

	test('CF4 · synchronisation admin : les vidéos Cloudflare inconnues s’importent, inactives ; un doublon est refusé', async ({ page, context }) => {
		const admin = await createUser({ role: 'ADMIN' });
		await loginAs(context, admin.id);
		await db.discoveryContent.create({ data: { category: 'MOTIVATION', title: 'Déjà là', cloudflareUid: 'cf-known', status: 'ready' } });
		await fakes.cloudflare.videos([
			{ uid: 'cf-known', meta: { name: 'Déjà là' }, status: { state: 'ready' }, duration: 60 },
			{ uid: 'cf-new', meta: { name: 'Nouvelle vidéo' }, status: { state: 'ready' }, duration: 125, thumbnail: 'https://thumb.test/new.jpg' }
		]);

		await page.goto('/admin/videos/sync');
		await expect(page.getByText('Nouvelle vidéo')).toBeVisible();
		await expect(page.getByRole('button', { name: /^importer$/i })).toHaveCount(1);
		await page.getByRole('button', { name: /^importer$/i }).click();
		await expect(page).toHaveURL(/\/admin\/videos\/?$/);

		expect(await db.discoveryContent.findUniqueOrThrow({ where: { cloudflareUid: 'cf-new' } })).toMatchObject({
			title: 'Nouvelle vidéo',
			active: false,
			status: 'ready',
			durationSeconds: 125
		});
		const duplicate = await page.request.post('/admin/videos/sync?/importVideo', { form: { uid: 'cf-new' }, headers: ACTION_HEADERS });
		// Une action SvelteKit répond 200 avec le résultat de l'action dans le corps.
		expect(await duplicate.json()).toMatchObject({ type: 'failure', status: 409 });
		expect(await db.discoveryContent.count({ where: { cloudflareUid: 'cf-new' } })).toBe(1);
	});
});

test.describe('PDF : chiffre d’affaires, factures, bordereaux', () => {
	async function paidTransaction(userId: string, amount: number, name: string) {
		return db.transaction.create({
			data: {
				stripePaymentId: `cs_test_pdf_${name}`,
				userId,
				amount,
				currency: 'eur',
				status: 'paid',
				customer_details_name: name,
				customer_details_email: `${name.toLowerCase()}@test.local`,
				offerSlugs: ['nutrition']
			}
		});
	}

	test('PDF1 · export du chiffre d’affaires : PDF téléchargé avec les paiements de la période', async ({ page, context }) => {
		const admin = await createUser({ role: 'ADMIN' });
		const client = await createUser();
		await paidTransaction(client.id, 249.99, 'Alice');
		await paidTransaction(client.id, 100, 'Bruno');
		await db.transaction.create({ data: { stripePaymentId: 'cs_test_pdf_unpaid', userId: client.id, amount: 999, currency: 'eur', status: 'unpaid', customer_details_name: 'Impayé' } });
		await loginAs(context, admin.id);

		await page.goto('/admin/sales');
		const year = new Date().getFullYear();
		const start = page.locator('input[type=date]').nth(0);
		const end = page.locator('input[type=date]').nth(1);
		await start.fill(`${year - 1}-01-01`);
		await end.fill(`${year + 1}-12-31`);
		const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /exporter le pdf/i }).click()]);
		expect(download.suggestedFilename()).toBe(`CA_${year - 1}-01-01_${year + 1}-12-31.pdf`);
		const text = await pdfText(download);
		expect(text.startsWith('%PDF')).toBe(true);
		expect(text).toContain('Paiements encaiss');
		expect(text).toContain('349.99 EUR');
		expect(text).not.toContain('Impay');

		// Période inversée : message, aucun téléchargement.
		await start.fill(`${year + 1}-01-01`);
		await end.fill(`${year}-01-01`);
		await page.getByRole('button', { name: /exporter le pdf/i }).click();
		await expect(page.getByRole('alert').filter({ hasText: /période valide/i })).toBeVisible();
	});

	test('PDF2 · bordereau de paiement (admin) : PDF avec montant et client', async ({ page, context }) => {
		const admin = await createUser({ role: 'ADMIN' });
		const client = await createUser();
		const transaction = await paidTransaction(client.id, 249.99, 'Carole');
		await loginAs(context, admin.id);

		const [download] = await Promise.all([page.waitForEvent('download'), page.goto(`/admin/sales/bordereau/${transaction.id}`).catch(() => null)]);
		expect(download.suggestedFilename()).toBe(`Bordereau_${transaction.id}.pdf`);
		const text = await pdfText(download);
		expect(text).toContain('BORDEREAU DE PAIEMENT');
		expect(text).toContain('249.99 EUR');
		expect(text).toContain('Carole');
	});

	test('PDF3 · facture : le client télécharge la sienne, l’admin celle de n’importe quel client', async ({ page, context, browser }) => {
		const client = await createUser({ paid: true });
		const transaction = await paidTransaction(client.id, 249.99, 'Dora');
		await loginAs(context, client.id);

		const [download] = await Promise.all([page.waitForEvent('download'), page.goto(`/auth/factures/${transaction.id}`).catch(() => null)]);
		expect(download.suggestedFilename()).toBe(`Facture_${transaction.id}.pdf`);
		const text = await pdfText(download);
		expect(text).toContain('FACTURE');
		expect(text).toContain('Total: 249.99 EUR');

		const admin = await createUser({ role: 'ADMIN' });
		const adminContext = await newIsolatedContext(browser, { acceptDownloads: true });
		await loginAs(adminContext, admin.id);
		const adminPage = await adminContext.newPage();
		const [adminDownload] = await Promise.all([
			adminPage.waitForEvent('download'),
			adminPage.goto(`${E2E_BASE_URL}/admin/sales/facture/${transaction.id}`).catch(() => null)
		]);
		expect(adminDownload.suggestedFilename()).toBe(`Facture_${transaction.id}.pdf`);
		await adminContext.close();
	});

	test('PDF4 · un client ne peut pas télécharger la facture d’un autre client', async ({ page, context }) => {
		const owner = await createUser({ paid: true });
		const intruder = await createUser({ paid: true });
		const transaction = await paidTransaction(owner.id, 249.99, 'Eve');
		await loginAs(context, intruder.id);
		await page.goto(`/auth/factures/${transaction.id}`);
		await expect(page).toHaveURL(/\/auth\/factures\/?$/);
	});
});
