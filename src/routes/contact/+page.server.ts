import { fail } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from '$lib/superforms-zod';

import { contactSchema } from '$lib/schema/contact/contactSchema';
import { createContact } from '$lib/prisma/contact/createContact';
import { getClientIP, contactFormLimiter } from '$lib/server/rate-limiter';
import { sendContactNotificationEmail } from '$lib/server/contactEmail';

	
import type { PageServerLoad, Actions } from './$types';

export const load = (async () => {
	const form = await superValidate(zod(contactSchema));
	return { form };
		
}) satisfies PageServerLoad;

export const actions: Actions = {
	submit: async (event) => {
		const form = await superValidate(event, zod(contactSchema));

		const ip = getClientIP(event);
		if (!contactFormLimiter.check(ip, 1)) {
			return fail(429, { form, message: 'Trop de requêtes. Réessayez dans une minute.' });
		}

		if (!form.valid) {
			return fail(400, { form, message: 'Vérifiez les champs du formulaire.' });
		}

		if (!contactFormLimiter.consume(ip, 1)) {
			return fail(429, { form, message: 'Trop de requêtes. Réessayez dans une minute.' });
		}

		const { name, email, subject, message: msg } = form.data as {
			name: string;
			email: string;
			subject?: string;
			message: string;
		};
		try {
			await createContact({
				name,
				email,
				subject: subject ?? undefined,
				message: msg
			});
		} catch (err) {
			console.error('[contact] createContact error', err);
			return fail(500, { form, message: 'Une erreur est survenue. Réessayez plus tard.' });
		}

		try {
			await sendContactNotificationEmail({
				name,
				email,
				subject: subject ?? undefined,
				message: msg
			});
		} catch (err) {
			console.error('[contact] sendContactNotificationEmail error', err);
			// Le message est déjà en base ; on ne bloque pas l’utilisateur
		}

		return message(form, 'Votre message a bien été envoyé. Nous vous recontacterons rapidement.');
	}
};
