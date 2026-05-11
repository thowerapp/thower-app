import { json } from '@sveltejs/kit';
import { uploadToR2 } from '$lib/server/cloudflare-r2';
import type { RequestHandler } from './$types';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Non authentifié' }, { status: 401 });
	}

	const formData = await request.formData();
	const file = formData.get('file') as File | null;

	if (!file) {
		return json({ error: 'Aucun fichier reçu' }, { status: 400 });
	}

	if (!ALLOWED_TYPES.includes(file.type)) {
		return json({ error: 'Type de fichier non autorisé (jpeg, png, webp uniquement)' }, { status: 400 });
	}

	if (file.size > MAX_SIZE) {
		return json({ error: 'Fichier trop lourd (max 10 Mo)' }, { status: 400 });
	}

	const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
	const key = `photos/${locals.user.id}/${crypto.randomUUID()}.${ext}`;

	const buffer = await file.arrayBuffer();
	await uploadToR2(key, buffer, file.type);

	const url = `/api/cloudflare/r2/image/${key}`;
	return json({ key, url });
};
