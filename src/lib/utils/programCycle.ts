import {
	TOTAL_PROGRAM_DAYS,
	addDaysCivil,
	civilDateInTimeZone,
	currentProgramDayIndex,
	nextMondayStartParis,
	zonedMidnightUtc
} from './programDay';

/**
 * Cycles de 91 jours (renouvellements).
 *
 * Les tables par utilisateur (NutritionDay, UserWorkoutDay, listes de courses…) sont indexées par
 * jour **absolu** : cycle 1 = 1..91, cycle 2 = 92..182… Les pages, le plan sport partagé, les tâches
 * du jour et les popups travaillent en jour **relatif** (1..91) avec le départ du cycle en cours.
 */
export type ProgramCycle = {
	/** 1 pour le premier programme ; 0 si aucune date de départ. */
	cycle: number;
	/** Départ (minuit Paris) du cycle en cours, null sans programme. */
	start: Date | null;
	/** Jour absolu = jour relatif + offset. */
	offset: number;
	/** Jour relatif courant (1..91), 0 avant le départ ou sans programme. */
	dayIndex: number;
	/** Départ posé mais pas encore atteint (premier cycle). */
	awaitingStart: boolean;
};

export type ProgramCycleFields = {
	programStartDate: Date | null;
	programCycleStarts?: Date[] | null;
};

/** Sélection Prisma des champs nécessaires à `resolveProgramCycle`. */
export const programCycleSelect = { programStartDate: true, programCycleStarts: true } as const;

/** Départs de tous les cycles, dans l'ordre (le premier est `programStartDate`). */
export function programCycleStarts(user: ProgramCycleFields | null | undefined): Date[] {
	if (!user?.programStartDate) return [];
	const later = [...(user.programCycleStarts ?? [])]
		.filter((d) => d.getTime() > user.programStartDate!.getTime())
		.sort((a, b) => a.getTime() - b.getTime());
	return [user.programStartDate, ...later];
}

/** Cycle en cours : le dernier dont le départ est atteint (le premier s'il n'a pas démarré). */
export function resolveProgramCycle(
	user: ProgramCycleFields | null | undefined,
	now: Date = new Date()
): ProgramCycle {
	const starts = programCycleStarts(user);
	if (starts.length === 0) return { cycle: 0, start: null, offset: 0, dayIndex: 0, awaitingStart: false };

	let index = 0;
	for (let i = 1; i < starts.length; i++) {
		if (currentProgramDayIndex(starts[i], now) > 0) index = i;
	}
	const start = starts[index];
	const dayIndex = currentProgramDayIndex(start, now);
	return {
		cycle: index + 1,
		start,
		offset: index * TOTAL_PROGRAM_DAYS,
		dayIndex,
		awaitingStart: index === 0 && dayIndex === 0
	};
}

/** Jour absolu (tables utilisateur) d'un jour relatif du cycle. */
export function absoluteDayIndex(cycle: Pick<ProgramCycle, 'offset'>, relativeDay: number): number {
	return cycle.offset + relativeDay;
}

/** Mois de suivi absolu (photos, bilans) : 1..3 au cycle 1, 4..6 au cycle 2… */
export function absoluteProgressMonth(cycle: Pick<ProgramCycle, 'cycle'>, relativeDay: number): number {
	const month = Math.min(3, Math.max(1, Math.ceil(relativeDay / 30)));
	return (Math.max(1, cycle.cycle) - 1) * 3 + month;
}

/**
 * Départ du cycle suivant un renouvellement : à la fin du dernier cycle (son départ + 91 jours,
 * un lundi), ou le lundi suivant le paiement si la personne renouvelle après la fin.
 */
export function nextCycleStart(starts: Date[], paidAt: Date = new Date()): Date {
	const last = starts[starts.length - 1];
	const c = civilDateInTimeZone(last);
	const end = addDaysCivil(c.year, c.month, c.day, TOTAL_PROGRAM_DAYS);
	const afterLast = zonedMidnightUtc(end.year, end.month, end.day);
	const nextMonday = nextMondayStartParis(paidAt);
	return afterLast.getTime() >= nextMonday.getTime() ? afterLast : nextMonday;
}

/** Une vidéo terminée compte pour le cycle en cours seulement si elle l'a été depuis son départ (cycle 2+). */
export function completedInCycle(
	completedAt: Date | null | undefined,
	cycle: Pick<ProgramCycle, 'cycle' | 'start'>
): boolean {
	if (!completedAt) return false;
	if (cycle.cycle <= 1 || !cycle.start) return true;
	return completedAt.getTime() >= cycle.start.getTime();
}

/** Filtre Prisma équivalent à `completedInCycle` sur `completedAt`. */
export function completedInCycleWhere(cycle: Pick<ProgramCycle, 'cycle' | 'start'>) {
	return cycle.cycle > 1 && cycle.start ? { gte: cycle.start } : { not: null };
}

/** Libellé du jour : « Jour 5 » au premier programme, « Cycle 2 · Jour 5 » ensuite. */
export function cycleDayLabel(cycle: number, dayIndex: number): string {
	return cycle > 1 ? `Cycle ${cycle} · Jour ${dayIndex}` : `Jour ${dayIndex}`;
}
