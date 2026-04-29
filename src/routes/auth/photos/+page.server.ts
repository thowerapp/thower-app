import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { z } from 'zod';
import { createProgressPhoto } from '$lib/prisma/progressPhoto/createProgressPhoto';

const submitPhotosSchema = z.object({
	frontUrl: z.string().url('URL de photo avant invalide'),
	sideUrl: z.string().url('URL de photo profil invalide'),
	backUrl: z.string().url('URL de photo arrière invalide')
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
				})
			]);

			throw redirect(302, '/auth/measurement');
		} catch (error) {
			if (error instanceof Response) throw error;
			console.error('[photos action]', error);
			return fail(500, { message: 'Erreur lors de l\'envoi des photos.' });
		}
	}
};
