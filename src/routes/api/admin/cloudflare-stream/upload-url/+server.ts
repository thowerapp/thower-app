import { error, json } from '@sveltejs/kit';
import {
	CloudflareStreamRequestError,
	createDirectUploadUrl,
	createTusDirectUpload
} from '$lib/server/cloudflare-stream';
import type { RequestHandler } from './$types';

/**
 * Réservé aux admins. Réponse JSON stable `{ uploadURL, uid }` (sans format d’action SvelteKit).
 * Utilisé par la page de création vidéo (upload tus).
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || locals.role !== 'ADMIN') {
		throw error(403, 'Accès refusé.');
	}

	const formData = await request.formData();
	const maxDurationSeconds = Number(formData.get('maxDurationSeconds') ?? 7200);
	const filename = String(formData.get('filename') ?? 'video');
	// Présent pour les fichiers > 200 Mio : upload tus créé côté serveur (direct_user).
	const uploadLength = Number(formData.get('uploadLength') ?? 0);

	try {
		const opts = {
			maxDurationSeconds: Math.max(60, Math.min(21600, maxDurationSeconds)),
			requireSignedURLs: true
		};
		const { uploadURL, uid } =
			uploadLength > 0
				? await createTusDirectUpload(uploadLength, { ...opts, name: filename })
				: await createDirectUploadUrl({
						...opts,
						meta: { name: filename, uploadedBy: locals.user.id }
					});
		return json({ uploadURL, uid });
	} catch (err) {
		console.error('[api/admin/cloudflare-stream/upload-url]', err);
		const msg = err instanceof Error ? err.message : 'Erreur inconnue';
		const status =
			err instanceof CloudflareStreamRequestError
				? err.httpStatus
				: 500;
		return json({ message: msg }, { status });
	}
};
