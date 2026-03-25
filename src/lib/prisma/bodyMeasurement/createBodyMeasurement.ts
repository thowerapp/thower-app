import { prisma } from '$lib/server';

export type CreateBodyMeasurementData = {
	userId: string;
	age?: number | null;
	heightCm?: number | null;
	weightKg?: number | null;
	waistCm?: number | null;
	chestCm?: number | null;
	armCm?: number | null;
};

export async function createBodyMeasurement(data: CreateBodyMeasurementData) {
	if (!prisma?.bodyMeasurement) {
		throw new Error(
			'Prisma client has no "bodyMeasurement" model. Run: npx prisma generate (then restart the dev server).'
		);
	}
	return prisma.bodyMeasurement.create({
		data: {
			userId: data.userId,
			age: data.age ?? undefined,
			heightCm: data.heightCm ?? undefined,
			weightKg: data.weightKg ?? undefined,
			waistCm: data.waistCm ?? undefined,
			chestCm: data.chestCm ?? undefined,
			armCm: data.armCm ?? undefined
		}
	});
}
