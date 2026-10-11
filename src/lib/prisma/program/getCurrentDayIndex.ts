import { getUserProgramCycle } from '$lib/server/programCycle';

/**
 * Retourne le jour courant de l'utilisateur dans son cycle de 91 jours (1–91).
 * Si le programme n'a pas démarré (date absente ou encore dans le futur), retourne 0.
 */
export async function getCurrentDayIndex(userId: string): Promise<number> {
	return (await getUserProgramCycle(userId)).dayIndex;
}
