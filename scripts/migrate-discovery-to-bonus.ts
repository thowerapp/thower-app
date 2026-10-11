/**
 * Fusionne les catégories Découverte MEDITATION, MINDSET et BREATHWORK dans BONUS (« Séance bonus »).
 * À lancer avant de déployer le schéma Prisma sans ces valeurs (sinon la lecture plante).
 *
 * Usage :
 *   tsx scripts/migrate-discovery-to-bonus.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	const result = await prisma.$runCommandRaw({
		update: 'discovery_contents',
		updates: [
			{
				q: { category: { $in: ['MEDITATION', 'MINDSET', 'BREATHWORK'] } },
				u: { $set: { category: 'BONUS' } },
				multi: true
			}
		]
	});
	console.log(`→ contenus passés en BONUS : ${(result as { nModified?: number }).nModified ?? 0}`);
}

main()
	.catch((err) => {
		console.error(err);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
