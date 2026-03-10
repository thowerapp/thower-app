import { getVapidPublicKey } from '$server/web-push';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const key = getVapidPublicKey();
	if (!key) {
		return json({ error: 'Web Push non configure' }, { status: 503 });
	}
	return json({ publicKey: key });
};
