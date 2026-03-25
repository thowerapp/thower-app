/**
 * SEED ADMIN — Crée un compte administrateur si absent.
 *
 * Prérequis : ENCRYPTION_KEY dans .env
 *
 * Si l'admin (admin@thower.com) n'existe pas : création avec TOTP + code de récupération.
 * Le code de récupération est affiché une seule fois — à conserver pour la 2FA.
 * Mot de passe par défaut : thower2026 (même hash que le seed principal).
 *
 * N'efface aucune donnée (contrairement à resetDb).
 */

import { PrismaClient } from '@prisma/client';
import { createCipheriv, randomBytes } from 'crypto';
import { decodeBase64 } from '@oslojs/encoding';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.ENCRYPTION_KEY) {
	throw new Error('ENCRYPTION_KEY is not defined in the environment variables.');
}

const key = decodeBase64(process.env.ENCRYPTION_KEY);
const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@thower.com';

/** @param {Buffer | string} data */
const encrypt = (data) => {
	const iv = randomBytes(16);
	const cipher = createCipheriv('aes-128-gcm', key, iv);
	const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
	const tag = cipher.getAuthTag();
	return Buffer.concat([iv, ciphertext, tag]);
};

const generateRecoveryCode = () => {
	return Math.floor(10000000 + Math.random() * 90000000).toString();
};

async function main() {
	try {
		const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
		if (existing) {
			console.log(`Compte admin déjà présent : ${ADMIN_EMAIL}`);
			return;
		}

		const totpKey = randomBytes(32);
		const encryptedTotpKey = encrypt(totpKey);
		const totpKeyBuffer = Buffer.from(encryptedTotpKey);

		const recoveryCode = generateRecoveryCode();
		const encryptedRecoveryCode = encrypt(Buffer.from(recoveryCode, 'utf-8')).toString('base64');

		const passwordHash =
			'$argon2id$v=19$m=19456,t=2,p=1$2h/u9dvpXqr5PiPa19tlBA$ZUYyS8+NjOxTodAaDO1ez5oVToWRfKCQWRabAe8sIgk';

		await prisma.user.create({
			data: {
				email: ADMIN_EMAIL,
				username: 'Admin',
				passwordHash,
				emailVerified: true,
				role: 'ADMIN',
				name: 'Admin User',
				totpKey: totpKeyBuffer,
				recoveryCode: encryptedRecoveryCode,
				googleId: null,
				isMfaEnabled: false
			}
		});

		console.log('Compte admin créé :', ADMIN_EMAIL);
		console.log('Mot de passe : thower2026');
		console.log('Code de récupération 2FA (à conserver) :', recoveryCode);
	} catch (error) {
		console.error('Erreur lors du seed admin:', error);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

main();
