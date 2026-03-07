import { prisma } from '$lib/server';
import type { ActivityLevel } from '@prisma/client';

type CreateMeasurementData = {
	userId: string;
	age?: number;
	heightCm?: number;
	weightKg?: number;
	waistCm?: number;
	chestCm?: number;
	armCm?: number;
	intermittentFastingMorning?: boolean;
	activityLevel?: string;
	painsPathologies?: string;
	contextParticular?: string;
	breadManagement?: string;
	sportActivity?: string;
	objectives?: string[];
};

export async function createMeasurement(data: CreateMeasurementData) {
	if (!prisma?.measurement) {
		throw new Error(
			'Prisma client has no "measurement" model. Run: npx prisma generate (then restart the dev server).'
		);
	}
	return prisma.measurement.create({
		data: {
			userId: data.userId,
			age: data.age ?? undefined,
			heightCm: data.heightCm ?? undefined,
			weightKg: data.weightKg ?? undefined,
			waistCm: data.waistCm ?? undefined,
			chestCm: data.chestCm ?? undefined,
			armCm: data.armCm ?? undefined,
			intermittentFastingMorning: data.intermittentFastingMorning ?? undefined,
			activityLevel: (data.activityLevel as ActivityLevel) ?? undefined,
			painsPathologies: data.painsPathologies ?? undefined,
			contextParticular: data.contextParticular ?? undefined,
			breadManagement: data.breadManagement ?? undefined,
			sportActivity: data.sportActivity ?? undefined,
			objectives: data.objectives ?? []
		}
	});
}
