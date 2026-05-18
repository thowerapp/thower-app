/**
 * Crée admin@thower.com si absent (mot de passe : thower2026).
 * Utilisé par seed:admin et à la fin du seed catalogue.
 */

import { createCipheriv, randomBytes } from 'crypto';
import { decodeBase64 } from '@oslojs/encoding';

export const ADMIN_EMAIL = 'admin@thower.com';

const PASSWORD_HASH =
	'$argon2id$v=19$m=19456,t=2,p=1$2h/u9dvpXqr5PiPa19tlBA$ZUYyS8+NjOxTodAaDO1ez5oVToWRfKCQWRabAe8sIgk';

/** @param {Buffer | string} data */
function encrypt(data, key) {
	const iv = randomBytes(16);
	const cipher = createCipheriv('aes-128-gcm', key, iv);
	const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
	const tag = cipher.getAuthTag();
	return Buffer.concat([iv, ciphertext, tag]);
}

function generateRecoveryCode() {
	return Math.floor(10000000 + Math.random() * 90000000).toString();
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {Promise<{ created: boolean; recoveryCode?: string }>}
 */
export async function ensureAdminUser(prisma) {
	const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
	if (existing) {
		return { created: false };
	}

	if (!process.env.ENCRYPTION_KEY) {
		throw new Error('ENCRYPTION_KEY is not defined in the environment variables.');
	}

	const key = decodeBase64(process.env.ENCRYPTION_KEY);
	const totpKey = randomBytes(32);
	const totpKeyBuffer = Buffer.from(encrypt(totpKey, key));
	const recoveryCode = generateRecoveryCode();
	const encryptedRecoveryCode = encrypt(Buffer.from(recoveryCode, 'utf-8'), key).toString('base64');

	await prisma.user.create({
		data: {
			email: ADMIN_EMAIL,
			username: 'Admin',
			passwordHash: PASSWORD_HASH,
			emailVerified: true,
			role: 'ADMIN',
			name: 'Admin User',
			totpKey: totpKeyBuffer,
			recoveryCode: encryptedRecoveryCode,
			googleId: null,
			isMfaEnabled: false
		}
	});

	return { created: true, recoveryCode };
}
