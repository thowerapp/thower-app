/**
 * Helpers pour les notifications PWA.
 * - La permission doit être demandée à la suite d'un geste utilisateur (clic).
 * - Les notifications sont affichées via le Service Worker pour qu'elles restent
 *   visibles même si l'app est en arrière-plan ou fermée.
 */

const DEFAULT_ICON = '/logo.svg';

export type NotificationPermission = 'default' | 'granted' | 'denied';

/** Vérifie si les notifications sont supportées (SW + Notifications API). */
export function isNotificationSupported(): boolean {
	return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window;
}

/** Retourne l'état actuel de la permission. */
export function getNotificationPermission(): NotificationPermission {
	if (!('Notification' in window)) return 'denied';
	return Notification.permission as NotificationPermission;
}

/**
 * Message d'aide quand la permission est refusée : comment réactiver dans les paramètres.
 * Sur mobile le navigateur ne redemande pas la permission, il faut passer par les réglages.
 */
export const NOTIFICATION_DENIED_HELP =
	'Pour activer les notifications : ouvrez le menu du navigateur (⋮) → Paramètres du site (ou "Paramètres") → Notifications → Autoriser. Sur téléphone : Réglages du site → Notifications.';

/**
 * Demande la permission d'afficher des notifications.
 * À appeler uniquement après un geste utilisateur (ex: clic sur un bouton).
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
	if (!('Notification' in window)) return 'denied';
	if (Notification.permission === 'granted') return 'granted';
	if (Notification.permission === 'denied') return 'denied';
	const result = await Notification.requestPermission();
	return result as NotificationPermission;
}

export interface ShowNotificationOptions {
	title: string;
	body?: string;
	icon?: string;
	data?: { url?: string; [key: string]: unknown };
}

/**
 * Convertit une clé VAPID base64 (URL-safe) en Uint8Array pour PushManager.subscribe().
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
	const rawData = atob(base64);
	const output = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
	return output;
}

/**
 * Récupère la clé publique VAPID côté serveur et enregistre l’abonnement push.
 * Permet de recevoir les notifications à 21h30 même quand l’app est fermée.
 */
export async function subscribeToPushAndRegister(): Promise<void> {
	if (!isNotificationSupported()) {
		throw new Error('Les notifications ne sont pas supportées dans ce navigateur.');
	}
	const permission = await requestNotificationPermission();
	if (permission !== 'granted') {
		throw new Error('Autorisez les notifications pour activer le rappel quotidien.');
	}
	const registration = await navigator.serviceWorker.ready;
	const res = await fetch('/api/push-vapid-public');
	if (!res.ok) {
		throw new Error('Service de notifications indisponible.');
	}
	const { publicKey } = (await res.json()) as { publicKey?: string };
	if (!publicKey) throw new Error('Clé push manquante.');
	const subscription = await registration.pushManager.subscribe({
		userVisibleOnly: true,
		applicationServerKey: urlBase64ToUint8Array(publicKey)
	});
	const subJson = subscription.toJSON();
	const pushRes = await fetch('/api/push-subscribe', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			endpoint: subJson.endpoint,
			keys: subJson.keys
		})
	});
	if (!pushRes.ok) {
		const err = await pushRes.json().catch(() => ({}));
		throw new Error((err as { error?: string }).error ?? 'Enregistrement de l’abonnement impossible.');
	}
}

/**
 * Affiche une notification de test via le Service Worker.
 * Utilise l'enregistrement SW actif pour que la notification reste visible
 * même si l'onglet est en arrière-plan.
 * En cas de succès, enregistre aussi l’abonnement push pour le rappel quotidien à 21h30.
 */
export async function showTestNotification(options?: Partial<ShowNotificationOptions>): Promise<void> {
	if (!isNotificationSupported()) {
		throw new Error('Les notifications ne sont pas supportées dans ce navigateur.');
	}
	const permission = await requestNotificationPermission();
	if (permission !== 'granted') {
		const message =
			permission === 'denied'
				? NOTIFICATION_DENIED_HELP
				: 'Autorisez les notifications dans la fenêtre du navigateur.';
		throw new Error(message);
	}
	const registration = await navigator.serviceWorker.ready;
	await registration.showNotification(options?.title ?? 'Thower — Test', {
		body: options?.body ?? "Ceci est une notification de test. Si vous la voyez, les notifications PWA fonctionnent.",
		icon: options?.icon ?? DEFAULT_ICON,
		badge: options?.icon ?? DEFAULT_ICON,
		data: options?.data ?? { url: '/' }
	});
	// Enregistrer l’abonnement pour recevoir le rappel quotidien à 21h30 (même app fermée)
	try {
		await subscribeToPushAndRegister();
	} catch {
		// Ne pas faire échouer le test si l’enregistrement push échoue (ex. VAPID non configuré)
	}
}
