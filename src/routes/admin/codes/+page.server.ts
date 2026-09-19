import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { serializeData } from '$lib/utils/serializeData';
import { createRedemptionCodes } from '$lib/prisma/redemptionCode/createRedemptionCodes';
import { listRedemptionCodes } from '$lib/prisma/redemptionCode/listRedemptionCodes';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || locals.role !== 'ADMIN') {
		throw redirect(302, '/auth/login');
	}

	const codes = serializeData(await listRedemptionCodes());
	return { codes };
};

export const actions: Actions = {
	generate: async ({ request, locals }) => {
		if (!locals.user || locals.role !== 'ADMIN') {
			return fail(403, { message: 'Accès refusé.' });
		}

		const formData = await request.formData();
		const count = Number(formData.get('count') ?? 0);
		const note = String(formData.get('note') ?? '').trim();

		if (!Number.isFinite(count) || count < 1 || count > 100) {
			return fail(400, { message: 'Nombre de codes invalide (1 à 100).' });
		}

		try {
			const codes = await createRedemptionCodes({
				count: Math.floor(count),
				createdByAdminId: locals.user.id,
				note: note || null
			});
			return { success: true, codes };
		} catch (err) {
			console.error('[admin/codes] generate error', err);
			return fail(500, { message: 'Erreur lors de la génération des codes.' });
		}
	}
};
