/**
 * Dev only : force le programStartDate d'un utilisateur de test à un lundi passé
 * (aligné Europe/Paris, comme le ferait `nextMondayStartParis()` en prod),
 * pour pouvoir tester un programme "actif" sans attendre le vrai lundi suivant.
 *
 * Usage :
 *   tsx scripts/set-program-start.ts <email>                # lundi dernier (ou aujourd'hui si on est lundi)
 *   tsx scripts/set-program-start.ts <email> --weeks-ago=2   # il y a 2 lundis
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { civilDateInTimeZone, addDaysCivil, zonedMidnightUtc, currentProgramDayIndex } from '../src/lib/utils/programDay';

const prisma = new PrismaClient();

function lastMondayParis(weeksAgo: number, from: Date = new Date()): Date {
	const civil = civilDateInTimeZone(from);
	const daysSinceMonday = (civil.weekday + 6) % 7; // Mon=1 -> 0, Tue=2 -> 1, ..., Sun=0 -> 6
	const target = addDaysCivil(civil.year, civil.month, civil.day, -daysSinceMonday - weeksAgo * 7);
	return zonedMidnightUtc(target.year, target.month, target.day);
}

async function main() {
	const email = process.argv[2];
	if (!email) {
		console.error('Usage: tsx scripts/set-program-start.ts <email> [--weeks-ago=N]');
		process.exitCode = 1;
		return;
	}
	const weeksAgoArg = process.argv.find((a) => a.startsWith('--weeks-ago='));
	const weeksAgo = weeksAgoArg ? Number(weeksAgoArg.split('=')[1]) : 0;

	const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
	if (!user) {
		console.error(`Aucun utilisateur avec l'email ${email}`);
		process.exitCode = 1;
		return;
	}

	const start = lastMondayParis(weeksAgo);
	await prisma.user.update({ where: { id: user.id }, data: { programStartDate: start } });

	const dayIndex = currentProgramDayIndex(start);
	console.log(`${email} → programStartDate = ${start.toISOString()} (lundi Paris)`);
	console.log(`→ jour courant du programme : ${dayIndex}`);
}

main()
	.catch((err) => {
		console.error(err);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
