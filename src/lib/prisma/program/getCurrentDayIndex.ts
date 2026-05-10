import { prisma } from '$lib/server';

function startOfUtcDay(d: Date = new Date()): Date {
	const r = new Date(d);
	r.setUTCHours(0, 0, 0, 0);
	return r;
}

/**
 * Retourne le jour courant de l'utilisateur dans le programme (1–91).
 * Si le programme n'a pas démarré, retourne 0 (aucune vidéo débloquée).
 */
export async function getCurrentDayIndex(userId: string): Promise<number> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { programStartDate: true }
	});
	if (!user?.programStartDate) return 0;
	const today = startOfUtcDay();
	const start = startOfUtcDay(user.programStartDate);
	const diff = Math.floor((today.getTime() - start.getTime()) / 86_400_000);
	return Math.min(Math.max(diff + 1, 1), 91);
}
