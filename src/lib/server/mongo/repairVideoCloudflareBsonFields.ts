import { prisma } from '$lib/server';

const COLLECTIONS = ['discovery_contents', 'workout_videos'] as const;

/** Une seule passe par process Node (le pipeline est idempotent mais coûte un scan collection). */
let repairAlreadyRun = false;

/**
 * Réparation idempotente des documents Mongo hérités de YouTube :
 * - garantit un `cloudflareUid` non vide (copie depuis `youtubeId` si utile, sinon placeholder unique)
 * - supprime la clé BSON obsolète `youtubeId` (valeurs null / clé résiduelle pouvaient faire échouer Prisma au findMany)
 */
export async function repairVideoCloudflareBsonFields(): Promise<void> {
	if (repairAlreadyRun) return;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const db = prisma as any;
	if (!db?.$runCommandRaw) return;

	const pipeline = [
		{
			$set: {
				cloudflareUid: {
					$cond: {
						if: {
							$or: [
								{ $eq: [{ $ifNull: ['$cloudflareUid', null] }, null] },
								{ $eq: ['$cloudflareUid', ''] }
							]
						},
						then: {
							$cond: {
								if: {
									$and: [
										{ $ne: [{ $ifNull: ['$youtubeId', null] }, null] },
										{ $ne: ['$youtubeId', ''] }
									]
								},
								then: '$youtubeId',
								else: { $concat: ['cf_seeded_', { $toString: '$_id' }] }
							}
						},
						else: '$cloudflareUid'
					}
				},
				status: { $ifNull: ['$status', 'pending'] }
			}
		},
		{ $unset: 'youtubeId' }
	];

	for (const collection of COLLECTIONS) {
		try {
			await db.$runCommandRaw({
				update: collection,
				updates: [{ q: {}, u: pipeline, multi: true }]
			});
		} catch (e) {
			console.warn(`[repairVideoCloudflareBsonFields] ${collection}:`, e);
			return;
		}
	}
	repairAlreadyRun = true;
}
