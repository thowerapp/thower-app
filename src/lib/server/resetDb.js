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
		await prisma.$transaction([
			prisma.session.deleteMany(),
			prisma.emailVerificationRequest.deleteMany(),
			prisma.passwordResetSession.deleteMany(),
			prisma.transaction.deleteMany(),
			prisma.user.deleteMany()
		]);

		const totpKey = randomBytes(32);
		const encryptedTotpKey = encrypt(totpKey);
		const totpKeyBuffer = Buffer.from(encryptedTotpKey);

		const recoveryCode = generateRecoveryCode();
		const encryptedRecoveryCode = encrypt(Buffer.from(recoveryCode, 'utf-8')).toString('base64');

		const passwordHash =
			'$argon2id$v=19$m=19456,t=2,p=1$2h/u9dvpXqr5PiPa19tlBA$ZUYyS8+NjOxTodAaDO1ez5oVToWRfKCQWRabAe8sIgk';

		await prisma.user.create({
			data: {
				email: 'admin@thower.com',
				username: 'Admin',
				passwordHash: passwordHash,
				emailVerified: true,
				role: 'ADMIN',
				name: 'Admin User',
				totpKey: totpKeyBuffer,
				recoveryCode: encryptedRecoveryCode,
				googleId: null,
				isMfaEnabled: false
			}
		});
	} catch (error) {
		console.error('Erreur lors du reset:', error);
	} finally {
		await prisma.$disconnect();
	}
}

main();
