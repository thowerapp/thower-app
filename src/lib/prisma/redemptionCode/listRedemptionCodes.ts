import { prisma } from '$lib/server';

export type RedemptionCodeRow = {
	id: string;
	code: string;
	usedAt: Date | null;
	usedByEmail: string | null;
	note: string | null;
	createdAt: Date;
};

export async function listRedemptionCodes(): Promise<RedemptionCodeRow[]> {
	const rows = await prisma.redemptionCode.findMany({
		orderBy: { createdAt: 'desc' },
		include: { usedBy: { select: { email: true } } }
	});

	return rows.map((row) => ({
		id: row.id,
		code: row.code,
		usedAt: row.usedAt,
		usedByEmail: row.usedBy?.email ?? null,
		note: row.note,
		createdAt: row.createdAt
	}));
}
