import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server';
import { requireNutritionAccess } from '$lib/server/programAccessGuard';
import { generateNutritionDaysForUser } from '$lib/server/program-generation/nutrition/generateNutrition91Days';
import { NUTRITION_SEGMENT_DAYS } from '$lib/nutrition/nutritionPlanConstants';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const userId = locals.user.id;

	const profile = await prisma.userProfile.findUnique({
		where: { userId },
		select: { bodyFatPercent: true }
	});
	const lastMeasure = await prisma.bodyMeasurement.findFirst({
		where: { userId },
		orderBy: { createdAt: 'desc' },
		select: { weightKg: true }
	});

	return {
		canRegenerateNutrition:
			lastMeasure?.weightKg != null &&
			lastMeasure.weightKg > 0 &&
			profile?.bodyFatPercent != null &&
			profile.bodyFatPercent >= 3 &&
			profile.bodyFatPercent <= 70
	};
};

export const actions: Actions = {
	regenerateNutrition: async ({ locals }) => {
		if (!locals.user) return fail(401, { error: 'Non authentifié' });

		const userId = locals.user.id;

		try {
			await requireNutritionAccess(userId, locals.user.role);
		} catch {
			return fail(403, { error: 'Accès nutrition non activé' });
		}

		const profile = await prisma.userProfile.findUnique({
			where: { userId },
			select: { bodyFatPercent: true }
		});
		const lastMeasure = await prisma.bodyMeasurement.findFirst({
			where: { userId },
			orderBy: { createdAt: 'desc' },
			select: { weightKg: true }
		});

		if (
			lastMeasure?.weightKg == null ||
			lastMeasure.weightKg <= 0 ||
			profile?.bodyFatPercent == null ||
			profile.bodyFatPercent < 3 ||
			profile.bodyFatPercent > 70
		) {
			return fail(400, { error: 'Profil incomplet — ajoute ton poids et ton % masse grasse avant de recalibrer.' });
		}

		await prisma.nutritionDay.deleteMany({ where: { userId } });
		await generateNutritionDaysForUser(userId, NUTRITION_SEGMENT_DAYS);

		return { success: true };
	}
};
