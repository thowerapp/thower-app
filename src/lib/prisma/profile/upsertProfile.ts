import { prisma } from '$lib/server';
import type { ActivityLevel, Prisma } from '@prisma/client';
import type { BreadTypeValue } from '$lib/schema/profile/breadType';

/** Prisma rejette parfois des clés à `undefined` ; on les retire pour create/update. */
function omitUndefined<T extends Record<string, unknown>>(obj: T): T {
	const out = { ...obj };
	for (const key of Object.keys(out)) {
		if (out[key] === undefined) delete out[key];
	}
	return out;
}

export type UpsertProfileData = {
	intermittentFastingMorning?: boolean | null;
	activityLevel?: ActivityLevel | string | null;
	objectives?: string[];
	painsPathologies?: string | null;
	contextParticular?: string | null;
	breadDaily?: boolean;
	breadGramsPerDay?: number | null;
	breadType?: BreadTypeValue | null;
	breadManagement?: string | null;
	sportActivity?: string | null;
	allergens?: string[];
	coffeePerDay?: number | null;
	alcoholHabit?: boolean | null;
	tobaccoHabit?: boolean | null;
	breakfastEnabled?: boolean;
	bodyFatPercent?: number | null;
	weightLossGoalKg?: number | null;
	familyCoefficients?: unknown | null;
	shoppingListSortOrder?: string | null;
	// Bien-être
	stressLevel?: number | null;
	sleepQuality?: number | null;
	bodyConfidence?: number | null;
	digestionQuality?: number | null;
	happinessLevel?: number | null;
	readinessToChange?: number | null;
	// Alimentation & équipement
	kitchenEquipment?: string[];
	disgustingFoods?: string | null;
	// Objectifs détaillés
	physicalObjective?: string | null;
	eventMotivation?: string | null;
	// Addictions
	addictionsText?: string | null;
};

const toPayload = (data: UpsertProfileData) => ({
	intermittentFastingMorning: data.intermittentFastingMorning ?? undefined,
	activityLevel: (data.activityLevel as ActivityLevel) ?? undefined,
	objectives: data.objectives ?? [],
	painsPathologies: data.painsPathologies ?? undefined,
	contextParticular: data.contextParticular ?? undefined,
	breadDaily: data.breadDaily ?? false,
	breadGramsPerDay: data.breadGramsPerDay ?? undefined,
	breadType: data.breadType ?? undefined,
	breadManagement: data.breadManagement ?? undefined,
	sportActivity: data.sportActivity ?? undefined,
	allergens: data.allergens ?? [],
	coffeePerDay: data.coffeePerDay ?? undefined,
	alcoholHabit: data.alcoholHabit ?? undefined,
	tobaccoHabit: data.tobaccoHabit ?? undefined,
	breakfastEnabled: data.breakfastEnabled ?? false,
	bodyFatPercent: data.bodyFatPercent ?? undefined,
	weightLossGoalKg: data.weightLossGoalKg ?? undefined,
	familyCoefficients: data.familyCoefficients ?? undefined,
	shoppingListSortOrder: data.shoppingListSortOrder ?? undefined,
	// Bien-être
	stressLevel: data.stressLevel ?? undefined,
	sleepQuality: data.sleepQuality ?? undefined,
	bodyConfidence: data.bodyConfidence ?? undefined,
	digestionQuality: data.digestionQuality ?? undefined,
	happinessLevel: data.happinessLevel ?? undefined,
	readinessToChange: data.readinessToChange ?? undefined,
	// Alimentation & équipement
	kitchenEquipment: data.kitchenEquipment ?? [],
	disgustingFoods: data.disgustingFoods ?? undefined,
	// Objectifs détaillés
	physicalObjective: data.physicalObjective ?? undefined,
	eventMotivation: data.eventMotivation ?? undefined,
	// Addictions
	addictionsText: data.addictionsText ?? undefined
});

export async function upsertProfile(userId: string, data: UpsertProfileData) {
	const payload = omitUndefined(toPayload(data) as Record<string, unknown>) as ReturnType<typeof toPayload>;
	const create: Prisma.UserProfileUncheckedCreateInput = {
		userId,
		...payload
	};
	const update: Prisma.UserProfileUncheckedUpdateInput = { ...payload };
	return prisma.userProfile.upsert({
		where: { userId },
		create,
		update
	});
}
