/**
 * Migration one-shot YouTube → Cloudflare Stream.
 *
 * - Renomme `youtubeId` en `cloudflareUid` sur `workout_videos` et `discovery_contents`.
 * - Initialise `status: 'pending'` sur les documents qui n'en ont pas.
 * - Supprime les collections obsolètes `user_video_watches` et `user_discovery_watches`.
 *
 * Idempotent : peut être relancé sans effet sur des documents déjà migrés.
 *
 * Usage : node scripts/migrate-youtube-to-cloudflare.js
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	const db = /** @type {any} */ (prisma);
	console.log('═══ MIGRATION YouTube → Cloudflare Stream ═══\n');

	const renameWorkout = await db.$runCommandRaw({
		update: 'workout_videos',
		updates: [
			{
				q: { youtubeId: { $exists: true } },
				u: [
					{ $set: { cloudflareUid: '$youtubeId', status: { $ifNull: ['$status', 'pending'] } } },
					{ $unset: 'youtubeId' }
				],
				multi: true
			}
		]
	});
	console.log(`workout_videos : ${renameWorkout.nModified ?? renameWorkout.modifiedCount ?? 0} document(s) migré(s).`);

	const renameDiscovery = await db.$runCommandRaw({
		update: 'discovery_contents',
		updates: [
			{
				q: { youtubeId: { $exists: true } },
				u: [
					{ $set: { cloudflareUid: '$youtubeId', status: { $ifNull: ['$status', 'pending'] } } },
					{ $unset: 'youtubeId' }
				],
				multi: true
			}
		]
	});
	console.log(`discovery_contents : ${renameDiscovery.nModified ?? renameDiscovery.modifiedCount ?? 0} document(s) migré(s).`);

	// Phase 2 — documents sans youtubeId exploitable mais cloudflareUid manquant / null,
	// ou clé youtubeId résiduelle (ex. null) : normalise cloudflareUid + supprime youtubeId (idempotent)
	const bsonRepairPipeline = [
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
	for (const coll of ['discovery_contents', 'workout_videos']) {
		const r = await db.$runCommandRaw({
			update: coll,
			updates: [{ q: {}, u: bsonRepairPipeline, multi: true }]
		});
		const n = r?.nModified ?? r?.modifiedCount ?? r?.n ?? 0;
		console.log(`${coll} : réparation BSON (phase 2) — ${n} document(s) touché(s).`);
	}

	for (const collection of ['user_video_watches', 'user_discovery_watches']) {
		try {
			const res = await db.$runCommandRaw({ drop: collection });
			console.log(`${collection} : collection supprimée (${JSON.stringify(res)}).`);
		} catch (e) {
			console.log(`${collection} : ${e?.message ?? 'déjà absente'}`);
		}
	}

	console.log('\n═══ MIGRATION TERMINÉE ═══');
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
