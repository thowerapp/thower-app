import { test as base, expect, type Browser, type BrowserContextOptions } from '@playwright/test';
import { resetDatabase } from './db';
import { fakes } from './fakes';
import { E2E_BASE_URL } from './config';

/**
 * `test` des specs e2e : base éphémère vidée avant chaque test, et navigateur coupé de l'extérieur
 * (lecteur Cloudflare, polices, Stripe…) : seules les requêtes vers l'application passent.
 */
export const test = base.extend<{ cleanDb: void; isolateNetwork: void }>({
	cleanDb: [
		// Playwright impose un premier paramètre déstructuré, même sans dépendance.
		// eslint-disable-next-line no-empty-pattern
		async ({}, use) => {
			await resetDatabase();
			await fakes.reset();
			await use();
		},
		{ auto: true }
	],
	isolateNetwork: [
		async ({ context }, use) => {
			await context.route((url) => !url.href.startsWith(E2E_BASE_URL) && !url.protocol.startsWith('data'), (route) => route.abort());
			await use();
		},
		{ auto: true }
	]
});

export { expect };

/** Contexte supplémentaire (autre utilisateur) avec les mêmes garde-fous que le contexte de test : réseau externe coupé, URL de base. */
export async function newIsolatedContext(browser: Browser, options: BrowserContextOptions = {}) {
	const context = await browser.newContext({ baseURL: E2E_BASE_URL, locale: 'fr-FR', timezoneId: 'Europe/Paris', ...options });
	await context.route((url) => !url.href.startsWith(E2E_BASE_URL) && !url.protocol.startsWith('data'), (route) => route.abort());
	return context;
}
