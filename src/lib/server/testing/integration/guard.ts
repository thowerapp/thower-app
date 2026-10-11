/** Refuse toute base qui n'est pas la base éphémère locale : les tests d'intégration vident les collections. */
export function assertLocalTestDatabase(url: string): void {
	let host = '';
	let db = '';
	try {
		const parsed = new URL(url);
		host = parsed.hostname;
		db = parsed.pathname.slice(1);
	} catch {
		/* URL invalide : refusée ci-dessous */
	}
	if (host !== '127.0.0.1' || db !== 'thower_test') {
		throw new Error(
			`Tests d'intégration : DATABASE_URL doit viser la base éphémère locale (127.0.0.1/thower_test), reçu « ${host || 'invalide'} ». Lancer via npm run test:integration.`
		);
	}
}
