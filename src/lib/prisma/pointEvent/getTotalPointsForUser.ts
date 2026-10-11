import { prisma } from '$lib/server';

export async function getTotalPointsForUser(userId: string): Promise<number> {
	const result = await prisma.pointEvent.aggregate({
		where: { userId },
		_sum: { amount: true }
	});
	return result._sum.amount ?? 0;
}
