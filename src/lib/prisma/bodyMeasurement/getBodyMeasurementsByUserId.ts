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
	const client = prisma as unknown as {
		bodyMeasurement?: {
			findMany: (args: {
				where: { userId: string };
				orderBy: { createdAt: 'desc' };
				take: number;
			}) => Promise<unknown[]>;
		};
	};
	if (!client?.bodyMeasurement) {
		console.warn(
			'[getBodyMeasurementsByUserId] prisma.bodyMeasurement is undefined. Run: npx prisma generate'
		);
		return [];
	}
	const rows = await client.bodyMeasurement.findMany({
		where: { userId },
		orderBy: { createdAt: 'desc' },
		take
	});
	return rows as BodyMeasurementSnapshot[];
}
