import { prisma } from '$lib/server';

export type UserProfileSnapshot = {
	intermittentFastingMorning?: boolean | null;
	activityLevel?: 'SEDENTARY' | 'ACTIVE' | 'ATHLETE' | null;
	objectives: string[];
	painsPathologies?: string | null;
	contextParticular?: string | null;
	breadDaily?: boolean;
	breadGramsPerDay?: number | null;
	breadType?: string | null;
	breadManagement?: string | null;
	sportActivity?: string | null;
	allergens: string[];
	coffeePerDay?: number | null;
	alcoholHabit?: boolean | null;
	tobaccoHabit?: boolean | null;
	breakfastEnabled: boolean;
	bodyFatPercent?: number | null;
	weightLossGoalKg?: number | null;
	familyCoefficients?: unknown | null;
	shoppingListSortOrder?: string | null;
};

export async function getProfileByUserId(
	userId: string
): Promise<UserProfileSnapshot | null> {
	const row = await prisma.userProfile.findUnique({ where: { userId } });
	return row as UserProfileSnapshot | null;
}
