import { defineConfig, devices } from '@playwright/test';
import { E2E_BASE_URL } from './e2e/support/config';

/**
 * Tests de bout en bout : base MongoDB éphémère et environnement factice (voir e2e/support/server.ts).
 * Usage : npm run test:e2e   ·   interface : npx playwright test --ui
 */
export default defineConfig({
	testDir: 'e2e',
	globalTeardown: './e2e/support/coverageTeardown.ts',
	// Une seule base partagée, vidée par les tests : exécution en série.
	// Le serveur de dev compile les pages à la volée : un test ponctuellement trop lent est rejoué une fois.
	retries: 1,
	workers: 1,
	fullyParallel: false,
	timeout: 180_000,
	expect: { timeout: 10_000 },
	reporter: [['list'], ['html', { open: 'never' }]],
	use: {
		baseURL: E2E_BASE_URL,
		locale: 'fr-FR',
		timezoneId: 'Europe/Paris',
		// Mode dev : la première visite d'une page déclenche sa compilation.
		navigationTimeout: 120_000,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure'
	},
	projects: [{ name: 'mobile', use: { ...devices['Pixel 7'] } }],
	webServer: {
		command: 'npx tsx e2e/support/server.ts',
		// Attendre une vraie réponse de l'accueil : en mode dev, la première compilation prend plus d'une minute.
		url: E2E_BASE_URL,
		// Jamais de réutilisation : un serveur déjà lancé sur ce port pourrait pointer vers une vraie base.
		reuseExistingServer: false,
		timeout: 300_000,
		stdout: 'pipe'
	}
});
