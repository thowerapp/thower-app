import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { z } from 'zod';
import { createProgressPhoto } from '$lib/prisma/progressPhoto/createProgressPhoto';
import { prisma } from '$lib/server';

const submitPhotosSchema = z.object({
	frontUrl: z.string().startsWith('/api/cloudflare/r2/image/photos/', 'URL photo avant invalide'),
	sideUrl: z.string().startsWith('/api/cloudflare/r2/image/photos/', 'URL photo profil invalide'),
	backUrl: z.string().startsWith('/api/cloudflare/r2/image/photos/', 'URL photo arrière invalide')
});

export const load: PageServerLoad = async ({ locals }) => {
	// Guard : utilisateur doit être connecté
	if (!locals.user) {
		throw redirect(302, '/auth/login');
	}

	return {
		user: locals.user
	};
};

export const actions: Actions = {
	submitPhotos: async ({ locals, request }) => {
		if (!locals.user) {
			return fail(401, { message: 'Non authentifié.' });
		}

		const formData = await request.formData();
		const frontUrl = String(formData.get('frontUrl') ?? '');
		const sideUrl = String(formData.get('sideUrl') ?? '');
		const backUrl = String(formData.get('backUrl') ?? '');

		// Valider les URLs
		const validation = submitPhotosSchema.safeParse({
			frontUrl,
			sideUrl,
			backUrl
		});

		if (!validation.success) {
			const errorMsg = validation.error.errors[0]?.message || 'Erreur de validation';
			return fail(400, { message: errorMsg });
		}

		console.log(`[photos action] saving — user=${locals.user.id} front=${frontUrl} side=${sideUrl} back=${backUrl}`);

		try {
			// Créer les 3 ProgressPhoto avec month: 0 (inscription)
			await Promise.all([
				createProgressPhoto({
					userId: locals.user.id,
					angle: 'FRONT',
					url: frontUrl,
					month: 0
				}),
				createProgressPhoto({
					userId: locals.user.id,
					angle: 'SIDE',
					url: sideUrl,
					month: 0
				}),
				createProgressPhoto({
					userId: locals.user.id,
					angle: 'BACK',
					url: backUrl,
					month: 0
				}),
				// Ajouter +50 points pour photos soumises
				prisma.pointEvent.create({
					data: {
						userId: locals.user.id,
						type: 'PHOTO_UPLOAD',
						amount: 50,
						metadata: {
							source: 'auth-photos-submission',
							timestamp: new Date().toISOString()
						}
					}
				})
			]);
		} catch (error) {
			console.error('[photos action] ✗ DB error', error);
			return fail(500, { message: 'Erreur lors de l\'envoi des photos.' });
		}

		console.log(`[photos action] ✓ 3 photos + 50pts saved — user=${locals.user.id}`);
		throw redirect(302, '/auth/measurement');
	}
};

