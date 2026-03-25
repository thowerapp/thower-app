import { prisma } from '$lib/server';

export async function getProgressPhotosByUserAndMonth(userId: string, month: number) {
	const client = prisma as {
		progressPhoto?: {
			findMany: (args: {
				where: { userId: string; month: number };
				orderBy: { uploadedAt: 'desc' };
			}) => Promise<unknown[]>;
		};
	};
	if (!client?.progressPhoto) return [];
	return client.progressPhoto.findMany({
		where: { userId, month },
		orderBy: { uploadedAt: 'desc' }
	});
}
