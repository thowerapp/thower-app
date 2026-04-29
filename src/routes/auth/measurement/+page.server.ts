import { fail, redirect } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from '$lib/superforms-zod';
import {
	measurementSchema,
	type MeasurementSchema
} from '$lib/schema/measurement/measurementSchema';
import { normalizeStringList } from '$lib/schema/measurement/normalizeStringList';
import { getProfileByUserId } from '$lib/prisma/profile/getProfileByUserId';
import { upsertProfile } from '$lib/prisma/profile/upsertProfile';
import { createBodyMeasurement } from '$lib/prisma/bodyMeasurement/createBodyMeasurement';
import {
	getBodyMeasurementsByUserId,
	type BodyMeasurementSnapshot
} from '$lib/prisma/bodyMeasurement/getBodyMeasurementsByUserId';

import type { Actions, RequestEvent } from './$types';

export const load = async (event: RequestEvent) => {
	if (event.locals.session === null || event.locals.user === null) {
		return redirect(302, '/auth/login');
	}

	if (!event.locals.user.emailVerified) {
		return redirect(302, '/auth/verify-email');
	}

	const [profile, bodyMeasurements] = await Promise.all([
		getProfileByUserId(event.locals.user.id),
		getBodyMeasurementsByUserId(event.locals.user.id)
	]);

	const lastBody: BodyMeasurementSnapshot | null = bodyMeasurements[0] ?? null;

	const initialData: MeasurementSchema = {
		allergens: profile?.allergens ?? [],
		breakfastEnabled: false,
		age: lastBody?.age ?? undefined,
		heightCm: lastBody?.heightCm ?? undefined,
		weightKg: lastBody?.weightKg ?? undefined,
		waistCm: lastBody?.waistCm ?? undefined,
		chestCm: lastBody?.chestCm ?? undefined,
		armCm: lastBody?.armCm ?? undefined,
		bodyFatPercent: profile?.bodyFatPercent ?? undefined,
		weightLossGoalKg: profile?.weightLossGoalKg ?? undefined,
		intermittentFastingMorning: profile?.intermittentFastingMorning ?? undefined,
		activityLevel: profile?.activityLevel ?? undefined,
		objectives: profile?.objectives ?? [],
		painsPathologies: profile?.painsPathologies ?? undefined,
		contextParticular: profile?.contextParticular ?? undefined,
		breadDaily: profile?.breadDaily ?? false,
		breadGramsPerDay: profile?.breadGramsPerDay ?? undefined,
		breadType: profile?.breadType ?? undefined,
		breadManagement: profile?.breadManagement ?? undefined,
		sportActivity: profile?.sportActivity ?? undefined,
		// Bien-être
		stressLevel: (profile as { stressLevel?: number | null } | null)?.stressLevel ?? undefined,
		sleepQuality: (profile as { sleepQuality?: number | null } | null)?.sleepQuality ?? undefined,
		bodyConfidence: (profile as { bodyConfidence?: number | null } | null)?.bodyConfidence ?? undefined,
		digestionQuality: (profile as { digestionQuality?: number | null } | null)?.digestionQuality ?? undefined,
		happinessLevel: (profile as { happinessLevel?: number | null } | null)?.happinessLevel ?? undefined,
		readinessToChange: (profile as { readinessToChange?: number | null } | null)?.readinessToChange ?? undefined,
		// Alimentation & équipement
		kitchenEquipment: (profile as { kitchenEquipment?: string[] } | null)?.kitchenEquipment ?? [],
		disgustingFoods: (profile as { disgustingFoods?: string | null } | null)?.disgustingFoods ?? undefined,
		otherAllergens: (profile as { otherAllergens?: string | null } | null)?.otherAllergens ?? undefined,
		// Objectifs détaillés
		physicalObjective: (profile as { physicalObjective?: string | null } | null)?.physicalObjective ?? undefined,
		eventMotivation: (profile as { eventMotivation?: string | null } | null)?.eventMotivation ?? undefined,
		// Addictions
		addictionsText: (profile as { addictionsText?: string | null } | null)?.addictionsText ?? undefined
	};

	initialData.objectives = normalizeStringList(initialData.objectives);
	initialData.allergens = normalizeStringList(initialData.allergens);
	initialData.kitchenEquipment = normalizeStringList(initialData.kitchenEquipment);

	const measurementForm = await superValidate(initialData, zod(measurementSchema));

	const bodyMeasurementsSafe = bodyMeasurements.map((m) => ({
		...m,
		createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt
	}));

	return {
		measurementForm,
		bodyMeasurements: bodyMeasurementsSafe
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

		const data = form.data as MeasurementSchema;
		const objectives = normalizeStringList(data.objectives);
		const allergens = normalizeStringList(data.allergens);
		const kitchenEquipment = normalizeStringList(data.kitchenEquipment);

		await upsertProfile(event.locals.user.id, {
			allergens,
			bodyFatPercent: data.bodyFatPercent,
			weightLossGoalKg: data.weightLossGoalKg,
			breakfastEnabled: data.breakfastEnabled,
			intermittentFastingMorning: data.intermittentFastingMorning,
			activityLevel: data.activityLevel,
			objectives,
			painsPathologies: data.painsPathologies,
			contextParticular: data.contextParticular,
			breadDaily: data.breadDaily,
			breadGramsPerDay: data.breadGramsPerDay,
			breadType: data.breadType,
			breadManagement: data.breadManagement,
			sportActivity: data.sportActivity,
			// Alimentation & équipement
			kitchenEquipment,
			disgustingFoods: data.disgustingFoods,
			otherAllergens: data.otherAllergens,
			// Objectifs détaillés
			physicalObjective: data.physicalObjective,
			eventMotivation: data.eventMotivation,
			// Addictions
			addictionsText: data.addictionsText
		});
		await createBodyMeasurement({
			userId: event.locals.user.id,
			age: data.age,
			heightCm: data.heightCm,
			weightKg: data.weightKg,
			waistCm: data.waistCm,
			chestCm: data.chestCm,
			armCm: data.armCm
		});

		return message(form, 'Mesures enregistrées');
	}
};
