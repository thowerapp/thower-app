import { zod } from '$lib/superforms-zod';
import type { PageServerLoad, Actions } from './$types';
import { message, superValidate } from 'sveltekit-superforms';
import { deleteContactSchema } from '$lib/schema/contact/contactSchema';
import { getAllContacts } from '$lib/prisma/contact/getAllContacts';
import { deleteContact } from '$lib/prisma/contact/deleteContact';
import { redirect } from '@sveltejs/kit';
import { serializeData } from '$lib/utils/serializeData';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/auth/login');
	}
	if (locals.role !== 'ADMIN') {
		throw redirect(302, '/');
	}

	const IdeleteContactSchema = await superValidate(zod(deleteContactSchema));
	const contacts = await getAllContacts();
	const allContacts = serializeData(contacts);

	return {
		IdeleteContactSchema,
		allContacts
	};
};

export const actions: Actions = {
	deleteContact: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;
		const form = await superValidate(formData, zod(deleteContactSchema));

		try {
			await deleteContact(id);
			return message(form, 'Message supprimé.');
		} catch (error) {
			console.error('Error deleting contact:', error);
			return { error: 'Impossible de supprimer le message.' };
		}
	}
};
