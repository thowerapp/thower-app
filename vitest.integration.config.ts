/**
 * Tests d'intégration : vraie base MongoDB éphémère (replica set en mémoire), jamais la base du `.env`.
 *
 * Usage : npm run test:integration
 * Variables : MONGOMS_VERSION (défaut 7.0.14 ; 4.4.29 sur un CPU sans AVX), MONGOMS_PORT (défaut 27027).
 */
import { readFileSync } from 'node:fs';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

const port = Number(process.env.MONGOMS_PORT ?? 27027);
// Posé avant le chargement de SvelteKit : `$env/dynamic/private` lit cette valeur, pas celle du `.env`.
process.env.DATABASE_URL = `mongodb://127.0.0.1:${port}/thower_test?replicaSet=testset&directConnection=true`;
process.env.MONGOMS_PORT = String(port);
process.env.PRISMA_COUNT_QUERIES = '1';
// Clé factice des tests (la même que pour les e2e) : le code de chiffrement exige une clé au chargement.
process.env.ENCRYPTION_KEY ??= readFileSync('e2e/env/.env', 'utf8').match(/^ENCRYPTION_KEY=(.*)$/m)?.[1]?.trim();

export default defineConfig({
	plugins: [sveltekit()],
	ssr: { external: ['@prisma/client'] },
	test: {
		include: ['src/**/*.integration.spec.ts'],
		globalSetup: ['src/lib/server/testing/integration/globalSetup.ts'],
		setupFiles: ['src/lib/server/testing/integration/setup.ts'],
		// Une seule base partagée : fichiers exécutés l'un après l'autre, base vidée avant chaque test.
		fileParallelism: false,
		testTimeout: 30_000,
		hookTimeout: 120_000,
		coverage: {
			provider: 'v8',
			reportsDirectory: 'coverage/integration',
			reporter: ['text-summary', 'json', 'html'],
			include: ['src/lib/**/*.ts', 'src/routes/**/*.ts', 'src/hooks.server.ts'],
			exclude: ['**/*.spec.ts', '**/*.test.ts', '**/*.d.ts', 'src/lib/server/testing/**']
		}
	}
});
