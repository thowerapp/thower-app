/// <reference lib="webworker" />
/**
 * Service worker personnalisé (injectManifest).
 * - Precaching via Workbox (manifest injecté par vite-plugin-pwa).
 * - skipWaiting / clientsClaim pour activation rapide.
 * - Notifications push et notificationclick.
 * - Runtime cache NetworkFirst avec expiration et cacheableResponse.
 */
import { clientsClaim, skipWaiting } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

// Precaching : manifest injecté à la build (chaîne self.__WB_MANIFEST requise pour le plugin)
precacheAndRoute(self.__WB_MANIFEST!);

// ——— Install : activation rapide du nouveau SW ———
self.addEventListener('install', () => {
	skipWaiting();
});

// ——— Activate : prise de contrôle + nettoyage ———
self.addEventListener('activate', (event: ExtendableEvent) => {
	clientsClaim();
	event.waitUntil(self.clients.claim());
});

// ——— Runtime cache : NetworkFirst avec expiration et cacheableResponse ———
// Limité aux assets de l’origine (pas /api, pas auth) pour éviter de cacher du sensible
const HTTP_CACHE = 'thower-http-cache';
const RUNTIME_CACHE_OPTIONS = {
	cacheName: HTTP_CACHE,
	networkTimeoutSeconds: 10,
	expiration: {
		maxEntries: 64,
		maxAgeSeconds: 60 * 60 * 24 // 24 h
	},
	cacheableResponse: {
		statuses: [0, 200]
	}
};

registerRoute(
	({ url }) => {
		const u = url.pathname;
		// Exclure API, auth, et routes sensibles
		if (u.startsWith('/api') || u.startsWith('/auth') || u.startsWith('/_app')) return false;
		// Cache uniquement les requêtes GET vers notre origine (pages, assets)
		return url.origin === self.location.origin;
	},
	new NetworkFirst(RUNTIME_CACHE_OPTIONS),
	'GET'
);

// ——— Notifications PWA ———
self.addEventListener('push', (event: PushEvent) => {
	let payload: { title?: string; body?: string; icon?: string; badge?: string; data?: { url?: string } } = {
		title: 'Thower',
		body: ''
	};
	if (event.data) {
		try {
			payload = event.data.json() ?? payload;
		} catch {
			const text = event.data.text();
			if (text) payload = { ...payload, body: text };
		}
	}
	const title = payload.title ?? 'Thower';
	const options: NotificationOptions = {
		body: payload.body ?? '',
		icon: payload.icon ?? '/logo.svg',
		badge: payload.badge ?? '/logo.svg',
		data: payload.data ?? { url: '/' }
	};
	event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
	event.notification.close();
	const url = (event.notification.data as { url?: string } | undefined)?.url ?? '/';
	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
			for (const client of clientList) {
				if (client.url.includes(self.registration.scope) && 'focus' in client) {
					(client as WindowClient).navigate(url);
					return (client as WindowClient).focus();
				}
			}
			if (self.clients.openWindow) return self.clients.openWindow(url);
		})
	);
});

// Écoute du message SKIP_WAITING depuis la page (pour mise à jour sur action utilisateur)
self.addEventListener('message', (event: ExtendableMessageEvent) => {
	if (event.data?.type === 'SKIP_WAITING') skipWaiting();
});
