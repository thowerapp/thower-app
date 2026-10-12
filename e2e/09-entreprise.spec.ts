/**
 * Zone 6 (suite) — Informations de l'entreprise : formulaire admin, mentions légales, PDF.
 * Documentation : docs/app/06-administration.md (règles `ENT1` à `ENT4`).
 */
import { readFile } from 'node:fs/promises';
import type { Download } from '@playwright/test';
import { test, expect } from './support/test';
import { createUser, db, loginAs } from './support/db';
import { E2E_BASE_URL } from './support/config';

const ACTION_HEADERS = { origin: E2E_BASE_URL, 'x-sveltekit-action': 'true' };

const COMPANY = {
	brandName: 'Thower',
	legalName: 'Thower SAS',
	legalForm: 'SAS',
	shareCapital: '10 000 €',
	siret: '12345678900012',
	rcs: 'RCS Paris B 123 456 789',
	vatNumber: 'FR12345678901',
	addressLine1: '1 rue de la Paix',
	postalCode: '75002',
	city: 'Paris',
	country: 'France',
	email: 'legal@thower.test',
	publicationDirector: 'Camille Martin',
	hostName: 'Hébergeur Test SA',
	hostAddress: '2 avenue du Cloud, 69000 Lyon',
	invoiceNote: 'TVA non applicable, art. 293 B du CGI',
	logoUrl: '/logo-app.png'
};

async function pdfText(download: Download): Promise<string> {
	return (await readFile(await download.path())).toString('latin1');
}

test.describe('Fiche entreprise', () => {
	test('ENT1 · l’admin enregistre la fiche ; une valeur invalide est refusée sans rien perdre', async ({
		page,
		context
	}) => {
		const admin = await createUser({ role: 'ADMIN' });
		await loginAs(context, admin.id);
		await page.goto('/admin/entreprise');

		await page.locator('#company-legalName').fill('Thower SAS');
		await page.locator('#company-siret').fill('123 456 789 00012');
		await page.locator('#company-vatNumber').fill('fr12345678901');
		await page.locator('#company-addressLine1').fill('1 rue de la Paix');
		await page.locator('#company-email').fill('legal@thower.test');
		await page.getByRole('button', { name: /^enregistrer$/i }).click();

		await expect
			.poll(async () => (await db.companyProfile.findUnique({ where: { key: 'main' } }))?.siret)
			.toBe('12345678900012');
		const saved = await db.companyProfile.findUniqueOrThrow({ where: { key: 'main' } });
		expect(saved).toMatchObject({
			legalName: 'Thower SAS',
			vatNumber: 'FR12345678901',
			brandName: 'Thower',
			updatedById: admin.id,
			city: null
		});

		// Un SIRET invalide : message sous le champ, ce qui était saisi reste, la fiche enregistrée ne change pas.
		await page.locator('#company-siret').fill('123');
		await page.locator('#company-city').fill('Lyon');
		await page.getByRole('button', { name: /^enregistrer$/i }).click();
		await expect(
			page.getByRole('alert').filter({ hasText: 'Le SIRET compte 14 chiffres.' })
		).toBeVisible();
		await expect(page.locator('#company-city')).toHaveValue('Lyon');
		expect((await db.companyProfile.findUniqueOrThrow({ where: { key: 'main' } })).city).toBeNull();

		// Retrouvée à la prochaine visite.
		await page.goto('/admin/entreprise');
		await expect(page.locator('#company-siret')).toHaveValue('12345678900012');
	});

	test('ENT2 · les mentions légales, la politique de confidentialité et les pieds de page reprennent la fiche', async ({
		page
	}) => {
		await db.companyProfile.create({ data: { ...COMPANY, brandName: 'Thower Studio' } });

		await page.goto('/mentions-legales');
		for (const text of [
			'Thower SAS',
			'SAS au capital de 10 000 €',
			'SIRET : 123 456 789 00012',
			'RCS Paris B 123 456 789',
			'TVA intracommunautaire : FR12345678901',
			'1 rue de la Paix',
			'75002 Paris',
			'legal@thower.test',
			'Directeur de la publication : Camille Martin',
			'Hébergeur Test SA',
			'2 avenue du Cloud, 69000 Lyon'
		]) {
			await expect(page.getByText(text).first(), text).toBeVisible();
		}
		await expect(page.getByText(`© ${new Date().getFullYear()} Thower Studio`)).toBeVisible();

		await page.goto('/politique-confidentialite');
		await expect(page.getByRole('link', { name: 'legal@thower.test' }).first()).toBeVisible();
		await expect(page.getByText(/Thower SAS, 1 rue de la Paix, 75002 Paris, France/)).toBeVisible();

		await page.goto('/cgu');
		await expect(page.getByText(`© ${new Date().getFullYear()} Thower Studio`)).toBeVisible();
	});

	test('ENT3 · sans fiche enregistrée, les pages restent servies avec le nom par défaut', async ({
		page
	}) => {
		await page.goto('/mentions-legales');
		await expect(page.getByRole('heading', { name: 'Éditeur du site' })).toBeVisible();
		await expect(
			page.getByText(`© ${new Date().getFullYear()} Thower · Tous droits réservés`)
		).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Hébergeur' })).toHaveCount(0);
	});

	test('ENT4 · les PDF reprennent la fiche : facture (avec logo), bordereau et chiffre d’affaires', async ({
		page,
		context
	}) => {
		await db.companyProfile.create({ data: COMPANY });
		const admin = await createUser({ role: 'ADMIN' });
		const client = await createUser({ paid: true });
		const transaction = await db.transaction.create({
			data: {
				stripePaymentId: 'cs_test_ent4',
				userId: client.id,
				amount: 249.99,
				currency: 'eur',
				status: 'paid',
				customer_details_name: 'Dora',
				customer_details_email: 'dora@test.local',
				offerSlugs: ['nutrition']
			}
		});

		await loginAs(context, client.id);
		const [invoice] = await Promise.all([
			page.waitForEvent('download'),
			page.goto(`/auth/factures/${transaction.id}`).catch(() => null)
		]);
		const invoiceText = await pdfText(invoice);
		for (const text of [
			'Thower SAS',
			'123 456 789 00012',
			'1 rue de la Paix',
			'75002 Paris',
			'legal@thower.test',
			'TVA non applicable, art. 293 B du CGI'
		]) {
			expect(invoiceText, text).toContain(text);
		}
		expect(invoiceText, 'le logo est embarqué').toContain('/Subtype /Image');

		await context.clearCookies();
		await loginAs(context, admin.id);
		const [slip] = await Promise.all([
			page.waitForEvent('download'),
			page.goto(`/admin/sales/bordereau/${transaction.id}`).catch(() => null)
		]);
		const slipText = await pdfText(slip);
		expect(slipText).toContain('Thower SAS');
		expect(slipText).toContain('123 456 789 00012');

		await page.goto('/admin/sales');
		const year = new Date().getFullYear();
		await page
			.locator('input[type=date]')
			.nth(0)
			.fill(`${year - 1}-01-01`);
		await page
			.locator('input[type=date]')
			.nth(1)
			.fill(`${year + 1}-12-31`);
		const [revenue] = await Promise.all([
			page.waitForEvent('download'),
			page.getByRole('button', { name: /exporter le pdf/i }).click()
		]);
		expect(await pdfText(revenue)).toContain('Thower');
	});

	test('ENT5 · seul un admin peut modifier la fiche', async ({ page, context }) => {
		await page.goto('/admin/entreprise');
		await expect(page).not.toHaveURL(/\/admin\/entreprise/);

		const user = await createUser();
		await loginAs(context, user.id);
		const response = await page.request.post('/admin/entreprise?/save', {
			form: { brandName: 'Pirate' },
			headers: ACTION_HEADERS
		});
		expect(response.status()).toBe(403);
		expect(await db.companyProfile.count()).toBe(0);
	});
});
