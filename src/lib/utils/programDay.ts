/** Programme Méthode Thower : 13 semaines × 7 jours (ou 12×7 + 7). */
export const TOTAL_PROGRAM_DAYS = 91;
export const TOTAL_PROGRAM_WEEKS = 13;

export function startOfUtcDay(d: Date): Date {
	const x = new Date(d);
	x.setUTCHours(0, 0, 0, 0);
	return x;
}

/**
 * Jour courant du programme (1..TOTAL_PROGRAM_DAYS) depuis `programStartDate` (aligné UTC minuit),
 * même logique que le layout utilisateur.
 */
export function currentProgramDayIndex(programStartDate: Date | null): number {
	if (!programStartDate) return 1;
	const start = startOfUtcDay(programStartDate);
	const today = startOfUtcDay(new Date());
	const diffDays = Math.floor((today.getTime() - start.getTime()) / 86_400_000) + 1;
	return Math.min(TOTAL_PROGRAM_DAYS, Math.max(1, diffDays));
}

/**
 * Numéro de semaine 1..13 contenant ce jour programme.
 */
export function programWeekNumber(dayIndex: number): number {
	return Math.min(TOTAL_PROGRAM_WEEKS, Math.max(1, Math.ceil(dayIndex / 7)));
}

/**
 * Premiers indices programme (1..91) de la semaine contenant `dayIndex`.
 */
export function programWeekBounds(containingDayIndex: number): {
	weekNumber: number;
	weekStart: number;
	weekEnd: number;
} {
	const d = Math.min(TOTAL_PROGRAM_DAYS, Math.max(1, containingDayIndex));
	const weekNumber = programWeekNumber(d);
	const weekStart = (weekNumber - 1) * 7 + 1;
	const weekEnd = Math.min(weekNumber * 7, TOTAL_PROGRAM_DAYS);
	return { weekNumber, weekStart, weekEnd };
}

/** Date civile (UTC) du jour programme `dayIndex` (1 = premier jour). */
export function calendarDateForProgramDay(programStartDate: Date, dayIndex: number): Date {
	const start = startOfUtcDay(programStartDate);
	const ms = start.getTime() + (dayIndex - 1) * 86_400_000;
	return new Date(ms);
}

const FR_WEEKDAY_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'] as const;

export function shortWeekdayFrUtc(d: Date): string {
	return FR_WEEKDAY_SHORT[d.getUTCDay()] ?? '—';
}
