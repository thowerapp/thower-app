import { zod } from '$lib/superforms-zod';
import type { PageServerLoad, Actions } from './$types';
import { fail, message, superValidate } from 'sveltekit-superforms';
import { deleteVideoSchema, parseCompositeVideoId } from '$lib/schema/video/videoAdminSchema';
import { getAllAdminVideos } from '$lib/prisma/video/getAllAdminVideos';
import { deleteVideo } from '$lib/prisma/video/deleteVideo';
import { serializeData } from '$lib/utils/serializeData';

export const load: PageServerLoad = async () => {
	const IdeleteVideoSchema = await superValidate(zod(deleteVideoSchema));
	const rawVideos = await getAllAdminVideos();
	// id composite `${kind}:${id}` pour permettre au Table partagé (qui ne passe que `id` au form)
	// de transporter le type vers l'action delete.
	const videos = serializeData(
		rawVideos.map((v) => ({ ...v, realId: v.id, id: `${v.kind}:${v.id}` }))
	);
	return {
		IdeleteVideoSchema,
		videos
	};
};

export const actions: Actions = {
	deleteVideo: async ({ request, locals }) => {
		if (!locals.user || locals.role !== 'ADMIN') {
			return fail(403, { message: 'Accès refusé.' });
		}

		const formData = await request.formData();
		const form = await superValidate(formData, zod(deleteVideoSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			const { kind, id } = parseCompositeVideoId(form.data.id as string);
			await deleteVideo(kind, id);
			return message(form, 'Vidéo supprimée.');
		} catch (err) {
			console.error('[admin/videos] deleteVideo error', err);
			return fail(500, { form, message: 'Erreur lors de la suppression.' });
		}
	}
};
