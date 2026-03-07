import { fail, redirect } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from '$lib/superforms-zod';
import { measurementSchema } from '$lib/schema/measurement/measurementSchema';
import { createMeasurement } from '$lib/prisma/measurement/createMeasurement';
import { getMeasurementsByUserId } from '$lib/prisma/measurement/getMeasurementsByUserId';

import type { Actions, RequestEvent } from './$types';

export const load = async (event: RequestEvent) => {
	if (event.locals.session === null || event.locals.user === null) {
		return redirect(302, '/auth/login');
	}

	if (!event.locals.user.emailVerified) {
		return redirect(302, '/auth/verify-email');
	}

	const measurements = await getMeasurementsByUserId(event.locals.user.id);
	const measurementForm = await superValidate(event, zod(measurementSchema));

	return {
		measurementForm,
		measurements
	};
};

export const actions: Actions = {
	save: async (event: RequestEvent) => {
		if (event.locals.session === null || event.locals.user === null) {
			return fail(401, { form: { message: 'Non authentifié' } });
		}

		const form = await superValidate(event, zod(measurementSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		await createMeasurement({
			...form.data,
			userId: event.locals.user.id
		});

		return message(form, 'Mesures enregistrées');
	}
};
