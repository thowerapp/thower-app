import { prisma } from '$lib/server';
import type { PointEventType } from '@prisma/client';

export type CreatePointEventData = {
	userId: string;
	type: PointEventType;
	amount: number;
	metadata?: Record<string, unknown> | null;
};

export async function createPointEvent(data: CreatePointEventData) {
	const client = prisma as {
		pointEvent?: {
			create: (args: { data: unknown }) => Promise<unknown>;
		};
	};
	if (!client?.pointEvent) {
		throw new Error('Prisma client has no "pointEvent" model. Run: npx prisma generate');
	}
	return client.pointEvent.create({
		data: {
			userId: data.userId,
			type: data.type,
			amount: data.amount,
			metadata: data.metadata ?? undefined
		}
	});
}
