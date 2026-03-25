import { json } from '@sveltejs/kit';
import { uploadToR2 } from '$lib/server/cloudflare-r2';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const formData = await request.formData();
	const file = formData.get('file') as File | null;

	if (!file) {
		return json({ error: 'Aucun fichier reçu' }, { status: 400 });
	}

	const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
	if (!allowedTypes.includes(file.type)) {
		return json({ error: 'Type de fichier non autorisé' }, { status: 400 });
	}

	const ext = file.name.split('.').pop();
	const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

	const buffer = await file.arrayBuffer();
	await uploadToR2(key, buffer, file.type);

	return json({ key });
};
