import { prisma } from '$lib/server';

export async function getMeasurementsByUserId(userId: string, take = 10) {
	if (!prisma?.measurement) {
		console.warn(
			'[getMeasurementsByUserId] prisma.measurement is undefined. Run: npx prisma generate'
		);
		return [];
	}
	return prisma.measurement.findMany({
		where: { userId },
		orderBy: { createdAt: 'desc' },
		take
	});
}
