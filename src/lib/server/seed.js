import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	console.log('Seed: schéma Auth + Paiement uniquement — aucun donnée à insérer.');
	// Pour réinitialiser la BDD et créer un admin, utiliser resetDb.js
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
