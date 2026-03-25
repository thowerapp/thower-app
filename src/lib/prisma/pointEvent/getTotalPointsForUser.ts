import { prisma } from '$lib/server';

export async function getTotalPointsForUser(userId: string): Promise<number> {
	const client = prisma as {
		pointEvent?: {
			aggregate: (args: {
				where: { userId: string };
				_sum: { amount: true };
			}) => Promise<{ _sum: { amount: number | null } }>;
		};
	};
	if (!client?.pointEvent) return 0;
	const result = await client.pointEvent.aggregate({
		where: { userId },
		_sum: { amount: true }
	});
	return result._sum?.amount ?? 0;
}
