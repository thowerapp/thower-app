import type { ActivityLevel } from '@prisma/client';
import { prisma } from '$lib/server';
import { dailyMealTargets, type MealMacroTargets } from '$lib/nutrition/nutritionTargets';
import { breadMacrosForGrams, type BreadTypeValue } from '$lib/schema/profile/breadType';

/** Champs du profil utilisés pour les cibles des repas. */
export type MealTargetsProfile = {
	bodyFatPercent: number | null;
	activityLevel: string | null;
	breadDaily: boolean;
	breadGramsPerDay: number | null;
	breadType: string | null;
};

export const mealTargetsProfileSelect = {
	bodyFatPercent: true,
	activityLevel: true,
	breadDaily: true,
	breadGramsPerDay: true,
	breadType: true
} as const;

/** Apport du pain quotidien déclaré, ou null. */
export function profileBreadMacros(profile: MealTargetsProfile | null | undefined) {
	if (!profile?.breadDaily || !profile.breadType || profile.breadGramsPerDay == null || profile.breadGramsPerDay <= 0) {
		return null;
	}
	return breadMacrosForGrams(profile.breadType as BreadTypeValue, profile.breadGramsPerDay);
}

/** Cibles journalières des repas (pain déduit) pour un profil et un poids ; null si profil incomplet. */
export function mealTargetsFromProfile(
	profile: MealTargetsProfile | null | undefined,
	weightKg: number | null | undefined
): MealMacroTargets | null {
	if (!profile) return null;
	return dailyMealTargets({
		weightKg,
		bodyFatPercent: profile.bodyFatPercent,
		activityLevel: profile.activityLevel as ActivityLevel | null,
		bread: profileBreadMacros(profile)
	});
}

/** Charge profil + dernier poids et renvoie les cibles journalières des repas. */
export async function loadUserMealTargets(userId: string): Promise<MealMacroTargets | null> {
	const [profile, lastMeasure] = await Promise.all([
		prisma.userProfile.findUnique({ where: { userId }, select: mealTargetsProfileSelect }),
		prisma.bodyMeasurement.findFirst({
			where: { userId },
			orderBy: { createdAt: 'desc' },
			select: { weightKg: true }
		})
	]);
	return mealTargetsFromProfile(profile, lastMeasure?.weightKg ?? null);
}
