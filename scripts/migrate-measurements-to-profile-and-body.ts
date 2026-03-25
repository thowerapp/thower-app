/**
 * Migration one-shot : Measurement → UserProfile + BodyMeasurement
 * Déjà exécutée. Ne plus lancer après suppression du modèle Measurement du schéma Prisma.
 * Usage (historique): npx tsx scripts/migrate-measurements-to-profile-and-body.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	const measurements = await prisma.measurement.findMany({
		orderBy: { createdAt: 'desc' }
	});

	if (measurements.length === 0) {
		console.log('Aucune Measurement à migrer.');
		return;
	}

	// Dernière measurement par userId (déjà trié desc par createdAt)
	const latestByUser = new Map<string, (typeof measurements)[0]>();
	for (const m of measurements) {
		if (!latestByUser.has(m.userId)) {
			latestByUser.set(m.userId, m);
		}
	}

	// 1) Créer les BodyMeasurement pour chaque Measurement
	let bodyCount = 0;
	for (const m of measurements) {
		await prisma.bodyMeasurement.create({
			data: {
				userId: m.userId,
				createdAt: m.createdAt,
				age: m.age ?? undefined,
				heightCm: m.heightCm ?? undefined,
				weightKg: m.weightKg ?? undefined,
				waistCm: m.waistCm ?? undefined,
				chestCm: m.chestCm ?? undefined,
				armCm: m.armCm ?? undefined
			}
		});
		bodyCount++;
	}
	console.log(`BodyMeasurement: ${bodyCount} entrées créées.`);

	// 2) Upsert UserProfile à partir de la dernière Measurement par user
	let profileCount = 0;
	for (const [, m] of latestByUser) {
		await prisma.userProfile.upsert({
			where: { userId: m.userId },
			create: {
				userId: m.userId,
				intermittentFastingMorning: m.intermittentFastingMorning ?? undefined,
				activityLevel: m.activityLevel ?? undefined,
				objectives: m.objectives ?? [],
				painsPathologies: m.painsPathologies ?? undefined,
				contextParticular: m.contextParticular ?? undefined,
				breadManagement: m.breadManagement ?? undefined,
				sportActivity: m.sportActivity ?? undefined
			},
			update: {
				intermittentFastingMorning: m.intermittentFastingMorning ?? undefined,
				activityLevel: m.activityLevel ?? undefined,
				objectives: m.objectives ?? [],
				painsPathologies: m.painsPathologies ?? undefined,
				contextParticular: m.contextParticular ?? undefined,
				breadManagement: m.breadManagement ?? undefined,
				sportActivity: m.sportActivity ?? undefined
			}
		});
		profileCount++;
	}
	console.log(`UserProfile: ${profileCount} profils créés ou mis à jour.`);
	console.log('Migration terminée.');
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
