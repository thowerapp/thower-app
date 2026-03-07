import webpush from 'web-push';

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_MAILTO = process.env.VAPID_MAILTO ?? 'mailto:support@thower.com';

let configured = false;

function ensureVapid(): void {
	if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
		throw new Error('VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY doivent etre definis.');
	}
	if (!configured) {
		webpush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC, VAPID_PRIVATE);
		configured = true;
	}
}

export function getVapidPublicKey(): string | null {
	return VAPID_PUBLIC ?? null;
}

export interface PushSubscriptionPayload {
	endpoint: string;
	keys: { p256dh: string; auth: string };
}

export interface SendPushOptions {
	title?: string;
	body?: string;
	url?: string;
	icon?: string;
}

export async function sendWebPush(
	subscription: PushSubscriptionPayload,
	payload: SendPushOptions
): Promise<{ ok: boolean; error?: string }> {
	ensureVapid();
	const body = JSON.stringify({
		title: payload.title ?? 'Thower',
		body: payload.body ?? '',
		url: payload.url ?? '/',
		icon: payload.icon ?? '/logo.svg'
	});
	try {
		await webpush.sendNotification(
			{
				endpoint: subscription.endpoint,
				keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth }
			},
			body,
			{ TTL: 86400 }
		);
		return { ok: true };
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return { ok: false, error: message };
	}
}
