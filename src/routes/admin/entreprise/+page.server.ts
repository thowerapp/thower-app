import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { companyFormSchema } from '$lib/company/companyProfile';
import { getCompanyProfile, saveCompanyProfile } from '$lib/server/company';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || locals.role !== 'ADMIN') {
		throw redirect(302, '/auth/login');
	}
	return { profile: await getCompanyProfile() };
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		if (!locals.user || locals.role !== 'ADMIN') {
			return fail(403, { message: 'Accès refusé.' });
		}

		const values = Object.fromEntries(
			[...(await request.formData()).entries()].filter(([, v]) => typeof v === 'string')
		) as Record<string, string>;
		const parsed = companyFormSchema.safeParse(values);
		if (!parsed.success) {
			const errors: Record<string, string> = {};
			for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
			return fail(400, { message: 'Certains champs sont invalides.', errors, values });
		}

		await saveCompanyProfile(parsed.data, locals.user.id);
		return { success: true, message: 'Informations de l’entreprise enregistrées.' };
	}
};
