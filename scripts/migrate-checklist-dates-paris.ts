/**
 * Recale les dates de checklist (`DailyTaskCompletion.date`) de minuit UTC à minuit Europe/Paris,
 * la convention du programme. Le jour civil est conservé (une complétion du 14 reste au 14).
 *
 * Minuit Paris n'est jamais 00:00 UTC (UTC+1 ou UTC+2) : seules les anciennes dates sont touchées,
 * le script peut être relancé sans effet. Si une complétion existe déjà au nouveau jour pour la même
 * tâche, l'ancienne est supprimée (index unique utilisateur + tâche + jour).
 *
 * Usage :
 *   npm run migrate:checklist-dates            (simulation, aucune écriture)
 *   npm run migrate:checklist-dates -- --apply (écrit en base)
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { zonedMidnightUtc } from '../src/lib/utils/programDay';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

function isUtcMidnight(d: Date): boolean {
	return d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;
}

async function main() {
	const rows = await prisma.dailyTaskCompletion.findMany({
		select: { id: true, userId: true, taskId: true, date: true }
	});
	const legacy = rows.filter((r) => isUtcMidnight(r.date));
	const existing = new Set(rows.map((r) => `${r.userId}:${r.taskId}:${r.date.getTime()}`));

	let updated = 0;
	let removed = 0;
	for (const r of legacy) {
		const target = zonedMidnightUtc(r.date.getUTCFullYear(), r.date.getUTCMonth() + 1, r.date.getUTCDate());
		const key = `${r.userId}:${r.taskId}:${target.getTime()}`;
		if (existing.has(key)) {
			removed++;
			if (apply) await prisma.dailyTaskCompletion.delete({ where: { id: r.id } });
			continue;
		}
		existing.add(key);
		updated++;
		if (apply) await prisma.dailyTaskCompletion.update({ where: { id: r.id }, data: { date: target } });
	}

	console.log(`${rows.length} complétion(s), dont ${legacy.length} à minuit UTC.`);
	console.log(`${apply ? 'Recalées' : 'À recaler'} : ${updated} ; doublons ${apply ? 'supprimés' : 'à supprimer'} : ${removed}.`);
	if (!apply && legacy.length > 0) console.log('Simulation : relancer avec --apply pour écrire.');
}

main()
	.catch((err) => {
		console.error(err);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
