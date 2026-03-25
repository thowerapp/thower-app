import { prisma } from '$lib/server';
import type { PhotoAngle } from '@prisma/client';

export type CreateProgressPhotoData = {
	userId: string;
	angle: PhotoAngle;
	url: string;
	month: number;
};

export async function createProgressPhoto(data: CreateProgressPhotoData) {
	const client = prisma as { progressPhoto?: { create: (args: { data: unknown }) => Promise<unknown> } };
	if (!client?.progressPhoto) {
		throw new Error('Prisma client has no "progressPhoto" model. Run: npx prisma generate');
	}
	return client.progressPhoto.create({ data });
}
