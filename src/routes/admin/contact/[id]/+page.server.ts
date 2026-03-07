import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { getContactById } from '$lib/prisma/contact/getContactById';
import { serializeData } from '$lib/utils/serializeData';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw redirect(302, '/auth/login');
	}
	if (locals.role !== 'ADMIN') {
		throw redirect(302, '/');
	}

	const contact = await getContactById(params.id);
	if (!contact) {
		throw error(404, 'Message introuvable');
	}

	return {
		contact: serializeData(contact)
	};
};
