import { prisma } from '$lib/server';

export type BodyMeasurementSnapshot = {
	id: string;
	userId: string;
	createdAt: Date;
	age?: number | null;
	heightCm?: number | null;
	weightKg?: number | null;
	waistCm?: number | null;
	chestCm?: number | null;
	armCm?: number | null;
};

export async function getBodyMeasurementsByUserId(
	userId: string,
	take = 20
): Promise<BodyMeasurementSnapshot[]> {
	return prisma.bodyMeasurement.findMany({
		where: { userId },
		orderBy: { createdAt: 'desc' },
		take
	});
}
