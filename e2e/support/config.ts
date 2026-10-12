/** Ports et base des tests Playwright : volontairement inhabituels pour ne jamais réutiliser un serveur de dev. */
export const E2E_APP_PORT = 4380;
export const E2E_MONGO_PORT = 27037;
export const E2E_DATABASE_URL = `mongodb://127.0.0.1:${E2E_MONGO_PORT}/thower_e2e?replicaSet=e2eset&directConnection=true`;
export const E2E_FAKE_EXTERNALS_PORT = 4381;
export const E2E_FAKE_EXTERNALS_URL = `http://127.0.0.1:${E2E_FAKE_EXTERNALS_PORT}`;
/** Faux serveur SMTP (refuse les connexions tant qu'un test ne l'a pas activé). */
export const E2E_SMTP_PORT = 4382;
export const E2E_BASE_URL = `http://localhost:${E2E_APP_PORT}`;
/** Secret de webhook factice (e2e/env/.env) : les tests signent eux-mêmes les événements Stripe. */
export const E2E_STRIPE_WEBHOOK_SECRET = 'whsec_e2e_test_secret';

/** Les tests vident la base : refuse tout ce qui n'est pas la base éphémère locale. */
export function assertE2eDatabase(url: string): void {
	const parsed = new URL(url);
	if (parsed.hostname !== '127.0.0.1' || parsed.pathname !== '/thower_e2e') {
		throw new Error(`Tests e2e : base inattendue (${parsed.hostname}${parsed.pathname}).`);
	}
}
