/**
 * Préchargé par l'application des tests e2e (NODE_OPTIONS=--import) : les appels serveur vers Google,
 * Stripe et Cloudflare sont redirigés vers le faux serveur local (e2e/support/fakeExternals.ts).
 * Aucun appel réel ne part : seul le code de l'application est testé, pas ces services.
 */
import http from 'node:http';
import https from 'node:https';
import { syncBuiltinESMExports } from 'node:module';

const FAKE = process.env.E2E_FAKE_EXTERNALS_URL;

if (FAKE) {
	const fake = new URL(FAKE);
	const fetchPrefixes = { 'oauth2.googleapis.com': '/google', 'api.cloudflare.com': '/cloudflare' };

	const realFetch = globalThis.fetch;
	globalThis.fetch = function patchedFetch(input, init) {
		const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
		const url = new URL(raw);
		const prefix = fetchPrefixes[url.hostname];
		if (!prefix) return realFetch(input, init);
		const target = `${FAKE}${prefix}${url.pathname}${url.search}`;
		return realFetch(input instanceof Request ? new Request(target, input) : target, init);
	};

	// Le SDK Stripe passe par `https.request` (client HTTP Node).
	const realRequest = https.request;
	https.request = function patchedRequest(...args) {
		const options = args[0];
		const host =
			options && typeof options === 'object' && !(options instanceof URL)
				? (options.host ?? options.hostname)
				: null;
		if (host === 'api.stripe.com') {
			const req = http.request(
				{
					host: fake.hostname,
					port: fake.port,
					path: `/stripe${options.path}`,
					method: options.method,
					headers: options.headers
				},
				args[1]
			);
			// Le SDK attend l'évènement TLS `secureConnect` avant d'écrire : absent sur une connexion http,
			// on lui présente donc un socket « déjà connecté ».
			const once = req.once.bind(req);
			req.once = (event, listener) =>
				event === 'socket'
					? once(event, (socket) =>
							listener(
								new Proxy(socket, {
									get: (t, k) => (k === 'connecting' ? false : Reflect.get(t, k))
								})
							)
						)
					: once(event, listener);
			return req;
		}
		return realRequest.apply(this, args);
	};
	syncBuiltinESMExports();
}
