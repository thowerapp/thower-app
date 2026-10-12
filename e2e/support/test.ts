import { test as base, expect } from '@playwright/test';
import { resetDatabase } from './db';
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
