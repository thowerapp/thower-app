// Laisse le serveur écrire sa dernière couverture avant que Playwright ne l'arrête.
export default async function globalTeardown() {
	if (process.env.E2E_COVERAGE) await new Promise((resolve) => setTimeout(resolve, 3000));
}
