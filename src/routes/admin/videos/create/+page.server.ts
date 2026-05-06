import { zod } from '$lib/superforms-zod';
import type { PageServerLoad, Actions } from './$types';
import { fail, superValidate } from 'sveltekit-superforms';
import { redirect } from '@sveltejs/kit';
import { createVideoSchema, type CreateVideoSchema } from '$lib/schema/video/videoAdminSchema';
import { createVideo } from '$lib/prisma/video/createVideo';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || locals.role !== 'ADMIN') {
		throw redirect(302, '/admin');
	}
	const form = await superValidate(zod(createVideoSchema));

	return { form };
};

export const actions: Actions = {
	/**
	 * URL d’upload tus : `POST /api/admin/cloudflare-stream/upload-url` (JSON `{ uploadURL, uid }`).
	 * Cette action persiste la fiche Prisma une fois l’upload tus terminé côté navigateur.
	 * Le statut / durée / vignette seront complétés par le webhook Cloudflare.
	 */
	createVideo: async ({ request, locals }) => {
		if (!locals.user || locals.role !== 'ADMIN') {
			return fail(403, { message: 'Accès refusé.' });
		}

		const form = await superValidate(request, zod(createVideoSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const d = form.data as CreateVideoSchema;

		try {
			const row = await createVideo(d);

			throw redirect(302, `/admin/videos/${d.kind}/${row.id}`);
		} catch (err) {
			if ((err as { status?: number }).status === 302) throw err;
			console.error('[admin/videos/create] createVideo error', err);
			return fail(500, {
				form,
				message:
					err instanceof Error ? err.message : 'Erreur lors de la création de la vidéo.'
			});
		}
	}
};