import { prisma } from '$lib/server';
import type { ActivityLevel } from '@prisma/client';

export type UpsertProfileData = {
	intermittentFastingMorning?: boolean | null;
	activityLevel?: ActivityLevel | string | null;
	objectives?: string[];
	painsPathologies?: string | null;
	contextParticular?: string | null;
	breadManagement?: string | null;
	sportActivity?: string | null;
	allergens?: string[];
	coffeePerDay?: number | null;
	alcoholHabit?: boolean | null;
	tobaccoHabit?: boolean | null;
	breakfastEnabled?: boolean;
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
	breadManagement: data.breadManagement ?? undefined,
	sportActivity: data.sportActivity ?? undefined,
	allergens: data.allergens ?? [],
	coffeePerDay: data.coffeePerDay ?? undefined,
	alcoholHabit: data.alcoholHabit ?? undefined,
	tobaccoHabit: data.tobaccoHabit ?? undefined,
	breakfastEnabled: data.breakfastEnabled ?? false,
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
	const payload = toPayload(data);
	return prisma.userProfile.upsert({
		where: { userId },
		create: { userId, ...payload },
		update: payload
	});
}
