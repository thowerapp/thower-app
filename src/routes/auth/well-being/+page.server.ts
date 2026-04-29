import { fail, redirect } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from '$lib/superforms-zod';
import { wellBeingSchema, type WellBeingSchema } from '$lib/schema/well-being/wellBeingSchema';
import { getProfileByUserId } from '$lib/prisma/profile/getProfileByUserId';
import { upsertProfile } from '$lib/prisma/profile/upsertProfile';
import type { Actions, RequestEvent } from './$types';

export const load = async (event: RequestEvent) => {
	if (event.locals.session === null || event.locals.user === null) {
		return redirect(302, '/auth/login');
	}

	if (!event.locals.user.emailVerified) {
		return redirect(302, '/auth/verify-email');
	}

	const profile = await getProfileByUserId(event.locals.user.id);

	const initialData: WellBeingSchema = {
		stressLevel: (profile as { stressLevel?: number | null } | null)?.stressLevel ?? undefined,
		sleepQuality: (profile as { sleepQuality?: number | null } | null)?.sleepQuality ?? undefined,
		bodyConfidence: (profile as { bodyConfidence?: number | null } | null)?.bodyConfidence ?? undefined,
		digestionQuality: (profile as { digestionQuality?: number | null } | null)?.digestionQuality ?? undefined,
		happinessLevel: (profile as { happinessLevel?: number | null } | null)?.happinessLevel ?? undefined,
		readinessToChange: (profile as { readinessToChange?: number | null } | null)?.readinessToChange ?? undefined,
		addictionsText: (profile as { addictionsText?: string | null } | null)?.addictionsText ?? undefined
	};

	const wellBeingForm = await superValidate(initialData, zod(wellBeingSchema));

	return {
		wellBeingForm
	};
};

export const actions: Actions = {
	default: async (event: RequestEvent) => {
		if (event.locals.session === null || event.locals.user === null) {
			return fail(401, { form: { message: 'Non authentifié' } });
		}

		const form = await superValidate(event, zod(wellBeingSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		const data = form.data as WellBeingSchema;

		await upsertProfile(event.locals.user.id, {
			stressLevel: data.stressLevel,
			sleepQuality: data.sleepQuality,
			bodyConfidence: data.bodyConfidence,
			digestionQuality: data.digestionQuality,
			happinessLevel: data.happinessLevel,
			readinessToChange: data.readinessToChange,
			addictionsText: data.addictionsText
		});

		// Rediriger vers measurement avec flag new=1 pour masquer tabs
		throw redirect(302, '/auth/measurement?new=1');
	}
};
