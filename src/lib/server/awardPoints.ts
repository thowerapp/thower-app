import type { Prisma, PointEventType } from '@prisma/client';
import { prisma } from '$lib/server';
import { POINTS } from '$lib/server/pointsConfig';

/** Types dont le montant est fixe (`POINTS`) ; les autres exigent un `amount` explicite. */
type FixedPointType = keyof typeof POINTS;

export type PointAward =
	| { userId: string; type: FixedPointType; amount?: number; metadata?: Prisma.InputJsonObject }
	| {
			userId: string;
			type: Exclude<PointEventType, FixedPointType>;
			amount: number;
			metadata?: Prisma.InputJsonObject;
	  };

/** Client accepté : `prisma` (appel direct ou lot `$transaction([...])`) ou `tx` d'une transaction interactive. */
type PointsClient = Pick<Prisma.TransactionClient, 'pointEvent'>;

export function pointAmount(award: PointAward): number {
	return award.amount ?? POINTS[award.type as FixedPointType];
}

/**
 * Seule voie de création d'un `PointEvent` (hors édition manuelle par l'admin).
 * Retourne la requête Prisma sans l'attendre : utilisable seule (`await`), dans un lot
 * `prisma.$transaction([...])` ou avec le `tx` d'une transaction interactive.
 * L'anti-doublon reste au site d'appel, dans la même transaction que l'action qui rapporte les points.
 */
export function awardPoints(award: PointAward, client: PointsClient = prisma) {
	return client.pointEvent.create({
		data: {
			userId: award.userId,
			type: award.type,
			amount: pointAmount(award),
			metadata: award.metadata
		}
	});
}
