import type { Prisma, PointEventType } from '@prisma/client';
import { prisma } from '$lib/server';

export type CreatePointEventData = {
	userId: string;
	type: PointEventType;
	amount: number;
	metadata?: Record<string, unknown> | null;
};

export async function createPointEvent(data: CreatePointEventData) {
	return prisma.pointEvent.create({
		data: {
			userId: data.userId,
			type: data.type,
			amount: data.amount,
			metadata: (data.metadata ?? undefined) as Prisma.InputJsonValue | undefined
		}
	});
}
