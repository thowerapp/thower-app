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

/**
 * Supprime toutes les lignes de tous les modèles (ordre inverse des dépendances FK Prisma / Mongo).
 */
async function wipeAllData() {
	const db = /** @type {any} */ (prisma);

	/**
	 * @param {string} label Nom log (collection métier).
	 * @param {any} delegate prisma.<model> (absent si `prisma generate` pas à jour).
	 */
	async function wipe(label, delegate) {
		const del =
			delegate && typeof delegate.deleteMany === 'function' ? delegate.deleteMany.bind(delegate) : null;
		if (!del) {
			console.warn(`  → ${label} : ignoré (modèle absent du client Prisma — \`npx prisma generate\`)`);
			return;
		}
		const result = await del();
		console.log(`  → ${label} : ${result?.count ?? 0} ligne(s)`);
	}

	await wipe('shopping_items', db.shoppingItem);
	await wipe('shopping_lists', db.shoppingList);
	await wipe('meals', db.meal);
	await wipe('nutrition_days', db.nutritionDay);
	await wipe('user_favorite_recipes', db.userFavoriteRecipe);
	await wipe('recipe_ingredients', db.recipeIngredient);
	await wipe('user_program_day_item_completions', db.userProgramDayItemCompletion);
	await wipe('user_video_progress', db.userVideoProgress);
	await wipe('user_workout_days', db.userWorkoutDay);
	await wipe('point_events', db.pointEvent);
	await wipe('user_badges', db.userBadge);
	await wipe('daily_task_completions', db.dailyTaskCompletion);
	await wipe('user_daily_task_opt_outs', db.userDailyTaskOptOut);
	await wipe('progress_photos', db.progressPhoto);
	await wipe('monthly_checkins', db.monthlyCheckIn);
	await wipe('user_challenges', db.userChallenge);
	await wipe('push_subscriptions', db.pushSubscription);
	await wipe('sessions', db.session);
	await wipe('email_verification_requests', db.emailVerificationRequest);
	await wipe('password_reset_sessions', db.passwordResetSession);
	await wipe('transactions', db.transaction);
	await wipe('body_measurements', db.bodyMeasurement);
	await wipe('user_profiles', db.userProfile);
	await wipe('program_day_items', db.programDayItem);
	await wipe('program_days', db.programDay);
	await wipe('day_popups', db.dayPopup);
	await wipe('programs', db.program);
	await wipe('recipes', db.recipe);
	await wipe('workout_videos', db.workoutVideo);
	await wipe('workout_sessions', db.workoutSession);
	await wipe('discovery_contents', db.discoveryContent);
	await wipe('daily_tasks', db.dailyTask);
	await wipe('users', db.user);
	await wipe('offers', db.offer);
	await wipe('point_rewards', db.pointReward);
	await wipe('badges', db.badge);
	await wipe('admin_challenges', db.adminChallenge);
	await wipe('contacts', db.contact);
}

async function main() {
	try {
		console.log('Vidage complet de la base (toutes les collections applicatives)…');
		await wipeAllData();

		console.log('\nCréation du compte admin initial…');

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

		console.log('\nRéinitialisation terminée. Compte admin : admin@thower.com (hash identique au seed / même mot de passe que les comptes de démo documentés dans seed.js).');
		console.log('Pense à lancer `npm run seed` pour recharger le catalogue (offres, programme 91 j, données démo…).');
	} catch (error) {
		console.error('Erreur lors du reset:', error);
		process.exitCode = 1;
	} finally {
		await prisma.$disconnect();
	}
}

main();
