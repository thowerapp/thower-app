import { fail, redirect } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from '$lib/superforms-zod';
import { wellBeingSchema, type WellBeingSchema } from '$lib/schema/well-being/wellBeingSchema';
import { getProfileByUserId, type UserProfileSnapshot } from '$lib/prisma/profile/getProfileByUserId';
import { upsertProfile } from '$lib/prisma/profile/upsertProfile';
import { onboardingTrace } from '$lib/server/onboarding/onboardingLog';
import type { Actions, RequestEvent } from './$types';

export const load = async (event: RequestEvent) => {
	if (event.locals.session === null || event.locals.user === null) {
		return redirect(302, '/auth/login');
	}

	if (!event.locals.user.emailVerified) {
		return redirect(302, '/auth/verify-email');
	}

	const profile = await getProfileByUserId(event.locals.user.id);
	const p = profile as UserProfileSnapshot & {
		stressLevel?: number | null;
		sleepQuality?: number | null;
		bodyConfidence?: number | null;
		digestionQuality?: number | null;
		happinessLevel?: number | null;
		readinessToChange?: number | null;
		addictionsText?: string | null;
	} | null;

	const initialData: WellBeingSchema = {
		stressLevel: p?.stressLevel ?? undefined,
		sleepQuality: p?.sleepQuality ?? undefined,
		bodyConfidence: p?.bodyConfidence ?? undefined,
		digestionQuality: p?.digestionQuality ?? undefined,
		happinessLevel: p?.happinessLevel ?? undefined,
		readinessToChange: p?.readinessToChange ?? undefined,
		addictionsText: p?.addictionsText ?? undefined
	};

	const wellBeingForm = await superValidate(initialData, zod(wellBeingSchema));

	onboardingTrace('well_being_load', {
		userId: event.locals.user.id,
		source: 'well-being',
		hasExistingProfile: profile != null,
		stressLevel: initialData.stressLevel ?? null,
		allSlidersFilled: [
			initialData.stressLevel,
			initialData.sleepQuality,
			initialData.bodyConfidence,
			initialData.digestionQuality,
			initialData.happinessLevel,
			initialData.readinessToChange
		].every((v) => v != null)
	});

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
			onboardingTrace('well_being_save', {
				userId: event.locals.user.id,
				source: 'well-being',
				outcome: 'validation_failed',
				errors: form.errors
			});
			return fail(400, { form });
		}

		const data = form.data as WellBeingSchema;
		const userId = event.locals.user.id;

		await upsertProfile(userId, {
			stressLevel: data.stressLevel,
			sleepQuality: data.sleepQuality,
			bodyConfidence: data.bodyConfidence,
			digestionQuality: data.digestionQuality,
			happinessLevel: data.happinessLevel,
			readinessToChange: data.readinessToChange,
			addictionsText: data.addictionsText
		});

		onboardingTrace('well_being_save', {
			userId,
			source: 'well-being',
			outcome: 'ok',
			stressLevel: data.stressLevel ?? null,
			redirectTo: '/auth/measurement?new=1'
		});

		// Rediriger vers measurement avec flag new=1 pour masquer tabs
		throw redirect(302, '/auth/measurement?new=1');
	}
};
