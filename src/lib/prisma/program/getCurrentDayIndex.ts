import { prisma } from '$lib/server';
import { currentProgramDayIndex } from '$lib/utils/programDay';

/**
 * Retourne le jour courant de l'utilisateur dans le programme (1–91).
 * Si le programme n'a pas démarré (date absente ou encore dans le futur), retourne 0.
 */
export async function getCurrentDayIndex(userId: string): Promise<number> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { programStartDate: true }
	});
	return currentProgramDayIndex(user?.programStartDate ?? null);
}
