import { prisma } from '$lib/server';

export async function getProgressPhotosByUserAndMonth(userId: string, month: number) {
	return prisma.progressPhoto.findMany({
		where: { userId, month },
		orderBy: { uploadedAt: 'desc' }
	});
}
