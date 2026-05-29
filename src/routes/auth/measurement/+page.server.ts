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
import { createProgressPhoto } from '$lib/prisma/progressPhoto/createProgressPhoto';
import {
	getBodyMeasurementsByUserId,
	type BodyMeasurementSnapshot
} from '$lib/prisma/bodyMeasurement/getBodyMeasurementsByUserId';
import { prisma } from '$lib/server';
import { scheduleProgramGenerationAfterPayment } from '$lib/server/program-generation';
import { dispatchProgramGeneration } from '$lib/server/program-generation/dispatchProgramGeneration';
import { programGenTrace } from '$lib/server/program-generation/programGenerationLog';
import { syncRecentPaidCheckoutSessionsForUser } from '$lib/server/stripe/reconcileCheckoutSession';
import { checkAccess } from '$lib/server/access';
import { logPaymentStatus, onboardingTrace } from '$lib/server/onboarding/onboardingLog';
import type { PhotoAngle } from '@prisma/client';

import type { Actions, RequestEvent } from './$types';

/** Génération nutrition peut durer >10s si waitUntil indisponible (repli await). */
export const config = {
	maxDuration: 300
};

async function replaceInitialProgressPhotos(userId: string, data: MeasurementSchema) {
	const photos: { angle: PhotoAngle; url: string }[] = [
		{ angle: 'FRONT', url: data.frontUrl },
		{ angle: 'SIDE', url: data.sideUrl },
		{ angle: 'BACK', url: data.backUrl }
	];
	const angles = photos.map((photo) => photo.angle);
	const client = prisma as {
		progressPhoto?: {
			deleteMany: (args: {
				where: { userId: string; month: number; angle: { in: PhotoAngle[] } };
			}) => Promise<unknown>;
		};
	};

	await client.progressPhoto?.deleteMany({
		where: {
			userId,
			month: 0,
			angle: { in: angles }
		}
	});

	await Promise.all(
		photos.map((photo) =>
			createProgressPhoto({
				userId,
				angle: photo.angle,
				url: photo.url,
				month: 0
			})
		)
	);
}

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

	checkAccess(event.locals);

	const lastBody: BodyMeasurementSnapshot | null = bodyMeasurements[0] ?? null;

	const initialData: MeasurementSchema = {
		frontUrl: '',
		sideUrl: '',
		backUrl: '',
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

	const userId = event.locals.user.id;
	const paymentBeforeLoad = await logPaymentStatus(userId, 'measurement', 'measurement_load');

	onboardingTrace('measurement_load', {
		userId,
		source: 'measurement',
		measurementCount: bodyMeasurements.length,
		hasWellBeing: !!(profile as { stressLevel?: number | null } | null)?.stressLevel,
		hasValidPayment: paymentBeforeLoad.hasValidPayment
	});

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
			onboardingTrace('measurement_save', {
				userId: event.locals.user.id,
				source: 'measurement',
				outcome: 'validation_failed'
			});
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
			coffeePerDay: data.coffeePerDay,
			alcoholHabit: data.alcoholHabit,
			tobaccoHabit: data.tobaccoHabit,
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
		await replaceInitialProgressPhotos(event.locals.user.id, data);

		// Génération uniquement ici (plus depuis le webhook) : transaction `paid` + abo actif, ou compte ADMIN.
		const { id: userId, role } = event.locals.user;
		const isAdmin = role === 'ADMIN';

		const paymentBeforeSync = await logPaymentStatus(userId, 'measurement', 'before_stripe_sync');

		let hasValidPayment = paymentBeforeSync.hasValidPayment;
		let syncedFromStripe = false;
		if (!hasValidPayment && !isAdmin) {
			onboardingTrace('measurement_save', {
				userId,
				source: 'measurement',
				action: 'stripe_sync_start',
				reason: 'no_valid_payment_in_db'
			});
			hasValidPayment = await syncRecentPaidCheckoutSessionsForUser(userId);
			syncedFromStripe = hasValidPayment;
			await logPaymentStatus(userId, 'measurement', 'after_stripe_sync');
		}

		if (hasValidPayment || isAdmin) {
			const dispatchMode = await dispatchProgramGeneration(event, () =>
				scheduleProgramGenerationAfterPayment(userId, { role, source: 'measurement' })
			);
			onboardingTrace('measurement_save', {
				userId,
				source: 'measurement',
				outcome: 'ok',
				isAdmin,
				hasValidPayment,
				syncedFromStripe,
				action: 'schedule_generation',
				dispatchMode,
				redirectTo: '/auth'
			});
			programGenTrace('trigger', {
				userId,
				source: 'measurement',
				isAdmin,
				hasValidPayment,
				action: 'schedule_generation',
				dispatchMode
			});
			throw redirect(302, '/auth');
		}

		onboardingTrace('measurement_save', {
			userId,
			source: 'measurement',
			outcome: 'redirect_subscription',
			isAdmin,
			hasValidPayment,
			syncedFromStripe,
			reason: 'no_paid_transaction_after_sync',
			redirectTo: '/auth/subscription'
		});
		programGenTrace('schedule_denied', {
			userId,
			source: 'measurement',
			isAdmin,
			hasValidPayment,
			reason: 'redirect_to_subscription'
		});
		throw redirect(302, '/auth/subscription');
	}
};
