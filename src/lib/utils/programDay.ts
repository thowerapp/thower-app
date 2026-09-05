/** Programme Méthode Thower : 13 semaines × 7 jours (ou 12×7 + 7). */
export const TOTAL_PROGRAM_DAYS = 91;
export const TOTAL_PROGRAM_WEEKS = 13;
export const PROGRAM_TIMEZONE = 'Europe/Paris';

const MS_PER_DAY = 86_400_000;

export type CivilDate = {
	year: number;
	month: number;
	day: number;
	weekday: number;
};

const WEEKDAY_SHORT_EN: Record<string, number> = {
	Sun: 0,
	Mon: 1,
	Tue: 2,
	Wed: 3,
	Thu: 4,
	Fri: 5,
	Sat: 6
};

export function startOfUtcDay(d: Date): Date {
	const x = new Date(d);
	x.setUTCHours(0, 0, 0, 0);
	return x;
}

export function civilDateInTimeZone(
	date: Date,
	timeZone: string = PROGRAM_TIMEZONE
): CivilDate {
	const fmt = new Intl.DateTimeFormat('en-US', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		weekday: 'short'
	});
	const parts = fmt.formatToParts(date);
	const get = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((p) => p.type === type)?.value ?? '';
	return {
		year: Number(get('year')),
		month: Number(get('month')),
		day: Number(get('day')),
		weekday: WEEKDAY_SHORT_EN[get('weekday')] ?? 0
	};
}

/** Décalage `timeZone` à l’instant `date` : civil = UTC + offset. */
function timeZoneOffsetMs(date: Date, timeZone: string): number {
	const dtf = new Intl.DateTimeFormat('en-US', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23'
	});
	const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
	const asUtc = Date.UTC(
		Number(parts.year),
		Number(parts.month) - 1,
		Number(parts.day),
		Number(parts.hour),
		Number(parts.minute),
		Number(parts.second)
	);
	return asUtc - date.getTime();
}

/** Instant UTC correspondant à y-m-d 00:00:00 dans `timeZone`. */
export function zonedMidnightUtc(
	year: number,
	month: number,
	day: number,
	timeZone: string = PROGRAM_TIMEZONE
): Date {
	let utc = Date.UTC(year, month - 1, day, 0, 0, 0);
	for (let i = 0; i < 2; i++) {
		const offset = timeZoneOffsetMs(new Date(utc), timeZone);
		utc = Date.UTC(year, month - 1, day, 0, 0, 0) - offset;
	}
	return new Date(utc);
}

export function addDaysCivil(
	year: number,
	month: number,
	day: number,
	delta: number
): { year: number; month: number; day: number } {
	const t = Date.UTC(year, month - 1, day + delta);
	const d = new Date(t);
	return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function civilToEpochDays(c: { year: number; month: number; day: number }): number {
	return Date.UTC(c.year, c.month - 1, c.day) / MS_PER_DAY;
}

/**
 * Prochain lundi 00:00 Europe/Paris (lundi en cours si `from` est déjà un lundi Paris).
 */
export function nextMondayStartParis(from: Date = new Date()): Date {
	const civil = civilDateInTimeZone(from);
	const daysUntilMonday = civil.weekday === 1 ? 0 : (8 - civil.weekday) % 7;
	const target = addDaysCivil(civil.year, civil.month, civil.day, daysUntilMonday);
	return zonedMidnightUtc(target.year, target.month, target.day);
}

/**
 * Jour courant du programme (1..TOTAL_PROGRAM_DAYS) depuis `programStartDate`
 * (calendrier Europe/Paris).
 * 0 si la date n’existe pas ou si elle est encore dans le futur.
 */
export function currentProgramDayIndex(
	programStartDate: Date | null,
	now: Date = new Date()
): number {
	if (!programStartDate) return 0;
	const today = civilDateInTimeZone(now);
	const start = civilDateInTimeZone(programStartDate);
	const diffDays = civilToEpochDays(today) - civilToEpochDays(start);
	if (diffDays < 0) return 0;
	return Math.min(TOTAL_PROGRAM_DAYS, diffDays + 1);
}

/** Date de départ posée, mais le lundi n’est pas encore atteint. */
export function isProgramAwaitingStart(
	programStartDate: Date | null,
	now: Date = new Date()
): boolean {
	return programStartDate != null && currentProgramDayIndex(programStartDate, now) === 0;
}

export type CountdownParts = {
	days: number;
	hours: number;
	minutes: number;
	seconds: number;
	totalMs: number;
};

export function remainingUntil(target: Date, now: Date = new Date()): CountdownParts {
	const totalMs = Math.max(0, target.getTime() - now.getTime());
	const totalSeconds = Math.floor(totalMs / 1000);
	return {
		days: Math.floor(totalSeconds / 86_400),
		hours: Math.floor((totalSeconds % 86_400) / 3_600),
		minutes: Math.floor((totalSeconds % 3_600) / 60),
		seconds: totalSeconds % 60,
		totalMs
	};
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

/** Date civile (minuit Europe/Paris) du jour programme `dayIndex` (1 = premier jour). */
export function calendarDateForProgramDay(programStartDate: Date, dayIndex: number): Date {
	const start = civilDateInTimeZone(programStartDate);
	const target = addDaysCivil(start.year, start.month, start.day, dayIndex - 1);
	return zonedMidnightUtc(target.year, target.month, target.day);
}

const FR_WEEKDAY_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'] as const;

export function shortWeekdayFrUtc(d: Date): string {
	return FR_WEEKDAY_SHORT[civilDateInTimeZone(d).weekday] ?? '—';
}
