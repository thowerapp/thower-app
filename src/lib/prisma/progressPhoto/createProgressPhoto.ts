import { prisma } from '$lib/server';
import type { PhotoAngle } from '@prisma/client';

export type CreateProgressPhotoData = {
	userId: string;
	angle: PhotoAngle;
	url: string;
	month: number;
};

export async function createProgressPhoto(data: CreateProgressPhotoData) {
	return prisma.progressPhoto.create({ data });
}
