/**
 * Renomme les séances sport principales en « Séance 1 / 2 / 3 » (anciennement A / B / C).
 * Seuls les noms à lettre (« A », « Séance A »…) sont modifiés : un nom personnalisé en admin est conservé.
 *
 * Usage :
 *   npm run rename:workout-sessions
 */
import 'dotenv/config';
import { PrismaClient, type WorkoutSessionType } from '@prisma/client';

const prisma = new PrismaClient();

const RENAMES: { type: WorkoutSessionType; letter: string; name: string }[] = [
	{ type: 'MAIN_A', letter: 'A', name: 'Séance 1' },
	{ type: 'MAIN_B', letter: 'B', name: 'Séance 2' },
	{ type: 'MAIN_C', letter: 'C', name: 'Séance 3' }
];

async function main() {
	for (const { type, letter, name } of RENAMES) {
		const result = await prisma.workoutSession.updateMany({
			where: { type, name: { in: [letter, `Séance ${letter}`] } },
			data: { name }
		});
		console.log(`${type} : ${result.count} séance(s) renommée(s) en « ${name} »`);
	}

	const others = await prisma.workoutSession.findMany({
		where: { type: { in: RENAMES.map((r) => r.type) }, name: { notIn: RENAMES.map((r) => r.name) } },
		select: { type: true, name: true }
	});
	for (const s of others) {
		console.log(`Non modifiée (nom personnalisé) : ${s.type} « ${s.name} »`);
	}
}

main()
	.catch((err) => {
		console.error(err);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
