import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	getNotificationPermission,
	isNotificationSupported,
	NOTIFICATION_DENIED_HELP,
	requestNotificationPermission,
	showTestNotification,
	subscribeToPushAndRegister
} from './notifications';

type Permission = 'default' | 'granted' | 'denied';

const registration = {
	showNotification: vi.fn(async () => undefined),
	pushManager: { subscribe: vi.fn(async () => ({ toJSON: () => ({ endpoint: 'https://push.test/e', keys: { p256dh: 'k', auth: 'a' } }) })) }
};

/** Navigateur factice : Notification et service worker, ou aucun des deux. */
function browser(options: { permission?: Permission; requestResult?: Permission; supported?: boolean } = {}) {
	const { permission = 'granted', requestResult = 'granted', supported = true } = options;
	const Notification = Object.assign(vi.fn(), { permission, requestPermission: vi.fn(async () => requestResult) });
	vi.stubGlobal('window', supported ? { Notification } : {});
	vi.stubGlobal('Notification', Notification);
	vi.stubGlobal('navigator', supported ? { serviceWorker: { ready: Promise.resolve(registration) } } : {});
	return Notification;
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

beforeEach(() => {
	registration.showNotification.mockClear();
	registration.pushManager.subscribe.mockClear();
});
afterEach(() => vi.unstubAllGlobals());

describe('permission', () => {
	it('détecte la prise en charge et l’état de la permission', () => {
		browser({ permission: 'denied' });
		expect(isNotificationSupported()).toBe(true);
		expect(getNotificationPermission()).toBe('denied');
		browser({ supported: false });
		expect(isNotificationSupported()).toBe(false);
		expect(getNotificationPermission()).toBe('denied');
	});

	it('ne redemande pas une permission déjà tranchée, et la demande sinon', async () => {
		const granted = browser({ permission: 'granted' });
		expect(await requestNotificationPermission()).toBe('granted');
		expect(granted.requestPermission).not.toHaveBeenCalled();
		browser({ permission: 'denied' });
		expect(await requestNotificationPermission()).toBe('denied');
		const asking = browser({ permission: 'default', requestResult: 'granted' });
		expect(await requestNotificationPermission()).toBe('granted');
		expect(asking.requestPermission).toHaveBeenCalledOnce();
		browser({ supported: false });
		expect(await requestNotificationPermission()).toBe('denied');
	});
});

describe('subscribeToPushAndRegister', () => {
	it('refuse sans prise en charge ou sans autorisation', async () => {
		browser({ supported: false });
		await expect(subscribeToPushAndRegister()).rejects.toThrow('pas supportées');
		browser({ permission: 'default', requestResult: 'denied' });
		await expect(subscribeToPushAndRegister()).rejects.toThrow('Autorisez les notifications');
	});

	it('récupère la clé publique, s’abonne et enregistre l’abonnement sur le serveur', async () => {
		browser();
		const fetchMock = vi.fn(async (url: string) => (url === '/api/push-vapid-public' ? json(200, { publicKey: 'AQAB-_' }) : json(200, { ok: true })));
		vi.stubGlobal('fetch', fetchMock);
		await subscribeToPushAndRegister();
		const key = (registration.pushManager.subscribe.mock.calls[0] as unknown as [{ applicationServerKey: Uint8Array }])[0].applicationServerKey;
		expect(Array.from(key)).toEqual([1, 0, 1, 251]);
		const [, init] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
		expect(JSON.parse(String(init.body))).toEqual({ endpoint: 'https://push.test/e', keys: { p256dh: 'k', auth: 'a' } });
	});

	it('signale un service indisponible, une clé manquante et un enregistrement refusé', async () => {
		browser();
		vi.stubGlobal('fetch', vi.fn(async () => json(503, {})));
		await expect(subscribeToPushAndRegister()).rejects.toThrow('indisponible');
		vi.stubGlobal('fetch', vi.fn(async () => json(200, {})));
		await expect(subscribeToPushAndRegister()).rejects.toThrow('Clé push manquante');
		vi.stubGlobal('fetch', vi.fn(async (url: string) => (url === '/api/push-vapid-public' ? json(200, { publicKey: 'AQAB' }) : json(400, { error: 'Refusé' }))));
		await expect(subscribeToPushAndRegister()).rejects.toThrow('Refusé');
		vi.stubGlobal('fetch', vi.fn(async (url: string) => (url === '/api/push-vapid-public' ? json(200, { publicKey: 'AQAB' }) : new Response('pas du json', { status: 500 }))));
		await expect(subscribeToPushAndRegister()).rejects.toThrow('Enregistrement de l’abonnement impossible');
	});
});

describe('showTestNotification', () => {
	it('refuse sans prise en charge, avec l’aide si la permission est refusée, ou sans réponse', async () => {
		browser({ supported: false });
		await expect(showTestNotification()).rejects.toThrow('pas supportées');
		browser({ permission: 'denied' });
		await expect(showTestNotification()).rejects.toThrow(NOTIFICATION_DENIED_HELP);
		browser({ permission: 'default', requestResult: 'default' });
		await expect(showTestNotification()).rejects.toThrow('fenêtre du navigateur');
	});

	it('affiche la notification, avec ses valeurs par défaut ou personnalisées, même si l’abonnement push échoue', async () => {
		browser();
		vi.stubGlobal('fetch', vi.fn(async () => json(503, {})));
		await showTestNotification();
		expect(registration.showNotification).toHaveBeenCalledWith('Thower — Test', expect.objectContaining({ icon: '/logo.svg', data: { url: '/' } }));
		await showTestNotification({ title: 'Titre', body: 'Corps', icon: '/i.png', data: { url: '/user' } });
		expect(registration.showNotification).toHaveBeenLastCalledWith('Titre', expect.objectContaining({ body: 'Corps', icon: '/i.png', badge: '/i.png', data: { url: '/user' } }));
	});
});
