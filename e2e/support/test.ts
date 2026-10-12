import { test as base, expect } from '@playwright/test';
import { resetDatabase } from './db';

/** `test` des specs e2e : la base éphémère est vidée avant chaque test. */
export const test = base.extend<{ cleanDb: void }>({
	cleanDb: [
		// Playwright impose un premier paramètre déstructuré, même sans dépendance.
		// eslint-disable-next-line no-empty-pattern
		async ({}, use) => {
			await resetDatabase();
			await use();
		},
		{ auto: true }
	]
});

export { expect };
