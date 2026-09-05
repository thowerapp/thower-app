/**
 * Reset one-shot : remet TOUS les utilisateurs à zéro sur le programme 91 jours
 * (sport + nutrition + points + badges + checklist quotidienne).
 * Les comptes utilisateur eux-mêmes ne sont PAS supprimés — seule leur progression l'est.
 *
 * Ce qui est réinitialisé :
 *   - User.programStartDate / programPausedAt / programPausedReason → null
 *   - UserWorkoutDay (placements + validations séances sport) → supprimés
 *   - NutritionDay (+ Meal en cascade) → supprimés
 *   - UserVideoProgress (progression vidéos sport/découverte) → supprimés
 *   - UserProgramDayItemCompletion (checklist jour, points) → supprimés
 *   - PointEvent (historique de points) → supprimés
 *   - UserBadge (badges débloqués) → supprimés
 *   - DailyTaskCompletion / UserDailyTaskOptOut → supprimés
 *
 * Ce qui N'EST PAS touché (retire les lignes correspondantes ci-dessous si besoin) :
 *   ProgressPhoto, MonthlyCheckIn, UserChallenge, Recipe perso, ShoppingList, favoris.
 *
 * Usage :
 *   DATABASE_URL="<url prod>" npx tsx scripts/reset-all-programs.ts              # dry-run, aucune écriture
 *   DATABASE_URL="<url prod>" npx tsx scripts/reset-all-programs.ts --confirm    # exécution réelle
 *
 * (Sans --confirm, le script ne fait qu'afficher ce qu'il supprimerait.)
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	const confirm = process.argv.includes('--confirm');

	const users = await prisma.user.findMany({ select: { id: true, email: true, role: true } });
	console.log(`${users.length} utilisateur(s) dans cette base :`);
	for (const u of users) console.log(`  - ${u.email} (${u.role})`);

	const counts = {
		usersWithStartDate: await prisma.user.count({ where: { programStartDate: { not: null } } }),
		workoutDays: await prisma.userWorkoutDay.count(),
		nutritionDays: await prisma.nutritionDay.count(),
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		videoProgress: await (prisma as any).userVideoProgress.count(),
		dayItemCompletions: await prisma.userProgramDayItemCompletion.count(),
		pointEvents: await prisma.pointEvent.count(),
		badges: await prisma.userBadge.count(),
		dailyTaskCompletions: await prisma.dailyTaskCompletion.count(),
		dailyTaskOptOuts: await prisma.userDailyTaskOptOut.count()
	};
	console.log('\nÀ supprimer / réinitialiser :');
	console.log(counts);

	if (!confirm) {
		console.log('\n[dry-run] Aucune écriture effectuée. Relance avec --confirm pour exécuter réellement.');
		return;
	}

	console.log('\n--confirm détecté, suppression en cours…');

	await prisma.userWorkoutDay.deleteMany({});
	await prisma.nutritionDay.deleteMany({});
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	await (prisma as any).userVideoProgress.deleteMany({});
	await prisma.userProgramDayItemCompletion.deleteMany({});
	await prisma.pointEvent.deleteMany({});
	await prisma.userBadge.deleteMany({});
	await prisma.dailyTaskCompletion.deleteMany({});
	await prisma.userDailyTaskOptOut.deleteMany({});
	await prisma.user.updateMany({
		data: { programStartDate: null, programPausedAt: null, programPausedReason: null }
	});

	console.log('Reset terminé — tous les utilisateurs repartent du jour 1.');
}

main()
	.catch((err) => {
		console.error(err);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
