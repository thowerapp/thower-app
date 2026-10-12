/** Pilotage des faux services externes depuis les tests (voir fakeExternals.ts). */
import { E2E_FAKE_EXTERNALS_URL } from './config';

async function control<T = unknown>(path: string, body?: unknown): Promise<T> {
	const res = await fetch(`${E2E_FAKE_EXTERNALS_URL}/__control/${path}`, {
		method: body === undefined ? 'GET' : 'POST',
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	return (await res.json()) as T;
}

export const fakes = {
	reset: () => control('reset', {}),
	google: {
		/** Identité renvoyée par Google quand l'application échange ce `code`. */
		identity: (
			code: string,
			identity: { sub: string; email: string; name: string; picture: string }
		) => control('google/identity', { code, ...identity })
	},
	stripe: {
		/** Les sessions créées sont payées d'emblée : le retour du checkout les rattrape. */
		autoPay: (enabled: boolean) => control('stripe/auto-pay', { enabled }),
		session: (session: Record<string, unknown> & { id: string }) =>
			control('stripe/session', session),
		sessions: () => control<Record<string, any>[]>('stripe/sessions')
	},
	/** Serveur d'emails : éteint par défaut (l'envoi échoue), comme un SMTP injoignable. */
	smtp: {
		up: (enabled = true) => control('smtp/up', { enabled }),
		messages: () => control<{ to: string[]; data: string }[]>('smtp/messages')
	},
	/** Géocodage OpenCage : sans résultats définis, la réponse n'a aucun champ `results`. */
	opencage: {
		results: (results: { formatted: string; components: Record<string, string> }[]) => control('opencage/results', results)
	},
	/** Service de notifications push du navigateur (`https://push.fake.test/...`). */
	push: {
		status: (status: number) => control('push/status', { status }),
		requests: () => control<{ path: string; headers: Record<string, string> }[]>('push/requests')
	},
		/** Objets du stockage R2 (photos) : clé, type et taille. */
	r2: {
		objects: () => control<{ key: string; type: string; size: number }[]>('r2/objects')
	},
	cloudflare: {
		videos: (
			videos: {
				uid: string;
				meta?: { name?: string };
				status?: { state?: string };
				duration?: number;
				thumbnail?: string;
				created?: string;
			}[]
		) => control('cloudflare/videos', videos),
		requests: () => control<{ method: string; path: string; body: any }[]>('cloudflare/requests')
	}
};
