/**
 * SEED ADMIN — Crée un compte administrateur si absent.
 *
 * Prérequis : ENCRYPTION_KEY dans .env
 *
 * Mot de passe par défaut : thower2026 (même hash que resetDb / seed démo).
 * N'efface aucune donnée (contrairement à resetDb).
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { ADMIN_EMAIL, ensureAdminUser } from './ensureAdminUser.js';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
	try {
		const result = await ensureAdminUser(prisma);
		if (result.created) {
			console.log('Compte admin créé :', ADMIN_EMAIL);
			console.log('Mot de passe : thower2026');
			console.log('Code de récupération 2FA (à conserver) :', result.recoveryCode);
		} else {
			console.log(`Compte admin déjà présent : ${ADMIN_EMAIL}`);
		}
	} catch (error) {
		console.error('Erreur lors du seed admin:', error);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

main();
