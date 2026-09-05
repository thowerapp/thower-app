import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { prisma } from '$lib/server';
import type { WorkoutSessionType } from '@prisma/client';
import {
	calendarDateForProgramDay,
	currentProgramDayIndex,
	startOfUtcDay,
	shortWeekdayFrUtc,
	TOTAL_PROGRAM_DAYS,
	TOTAL_PROGRAM_WEEKS
} from '$lib/utils/programDay';
import { serializeData } from '$lib/utils/serializeData';
import { requireSportAccess } from '$lib/server/programAccessGuard';
import { ensureProgramStartDate } from '$lib/server/program-generation/generateProgramForUser';

const PLANNER_SESSION_TYPES = ['MAIN_A', 'MAIN_B', 'MAIN_C', 'DISCOVERY'] as const;

type PlannerSessionType = (typeof PLANNER_SESSION_TYPES)[number];

type SessionCatalogRow = {
	id: string;
	name: string;
	type: WorkoutSessionType;
	weekNumber: number | null;
	order: number;
};

type WeekUserWorkoutRow = {
	sessionId: string;
	dayIndex: number;
	completedAt: Date | null;
	isLocked: boolean;
	session: {
		id: string;
		name: string;
		type: WorkoutSessionType;
		active: boolean;
	} | null;
};

type WeekResolvedSlot = {
	session: SessionCatalogRow | null;
	completedAt: Date | null;
	isLocked: boolean;
};

function pickSessionForType(
	sessions: SessionCatalogRow[],
	type: PlannerSessionType,
	selectedWeek: number
): SessionCatalogRow | null {
	const candidates = sessions.filter((session) => session.type === type);
	if (candidates.length === 0) return null;

	return (
		candidates.find((session) => session.weekNumber === selectedWeek) ??
		candidates.find((session) => session.weekNumber == null) ??
		candidates[0]
	);
}

function sessionTypeToLetter(t: WorkoutSessionType | null | undefined): string | null {
	if (!t) return null;
	if (t === 'MAIN_A') return 'A';
	if (t === 'MAIN_B') return 'B';
	if (t === 'MAIN_C') return 'C';
	if (t === 'DISCOVERY') return 'D';
	return null;
}

function buildResolvedWeekSlots(params: {
	weekStart: number;
	weekEnd: number;
	selectedSessions: SessionCatalogRow[];
	userRows: WeekUserWorkoutRow[];
}): Map<number, WeekResolvedSlot> {
	const { weekStart, weekEnd, selectedSessions, userRows } = params;
	const selectedById = new Map(selectedSessions.map((session) => [session.id, session]));

	const resolved = new Map<number, WeekResolvedSlot>();
	for (let dayIndex = weekStart; dayIndex <= weekEnd; dayIndex++) {
		resolved.set(dayIndex, {
			session: null,
			completedAt: null,
			isLocked: false
		});
	}

	const candidateRows = userRows
		.filter((row) => row.session?.active && selectedById.has(row.sessionId))
		.sort((a, b) => {
			const aCompleted = a.completedAt != null ? 1 : 0;
			const bCompleted = b.completedAt != null ? 1 : 0;
			if (aCompleted !== bCompleted) return bCompleted - aCompleted;
			return a.dayIndex - b.dayIndex;
		});

	const dedupBySessionId = new Map<string, WeekUserWorkoutRow>();
	for (const row of candidateRows) {
		if (!dedupBySessionId.has(row.sessionId)) {
			dedupBySessionId.set(row.sessionId, row);
		}
	}

	const usedDays = new Set<number>();
	const placedSessionIds = new Set<string>();

	for (const row of dedupBySessionId.values()) {
		if (row.dayIndex < weekStart || row.dayIndex > weekEnd) continue;
		if (usedDays.has(row.dayIndex)) continue;
		const session = selectedById.get(row.sessionId);
		if (!session) continue;

		resolved.set(row.dayIndex, {
			session,
			completedAt: row.completedAt,
			isLocked: row.isLocked
		});
		usedDays.add(row.dayIndex);
		placedSessionIds.add(session.id);
	}

	const remainingSessions = selectedSessions.filter((session) => !placedSessionIds.has(session.id));
	const preferredDays = [weekStart, weekStart + 2, weekStart + 4, weekStart + 6].filter(
		(day) => day <= weekEnd
	);

	for (let i = 0; i < remainingSessions.length; i++) {
		const session = remainingSessions[i];
		const preferredDay = preferredDays[i];
		let targetDay: number | null = null;

		if (preferredDay != null && !usedDays.has(preferredDay)) {
			targetDay = preferredDay;
		} else {
			for (let dayIndex = weekStart; dayIndex <= weekEnd; dayIndex++) {
				if (!usedDays.has(dayIndex)) {
					targetDay = dayIndex;
					break;
				}
			}
		}

		if (targetDay == null) break;

		resolved.set(targetDay, {
			session,
			completedAt: null,
			isLocked: false
		});
		usedDays.add(targetDay);
	}

	return resolved;
}

export type SportWeekStripEntry = {
	dayIndex: number;
	/** yyyy-mm-dd (UTC) pour afficher le numéro du jour civil */
	dateISO: string | null;
	weekdayShort: string;
	/** Si le programme prévoit une séance sport ce jour-là */
	hasProgramSession: boolean;
	sessionId: string | null;
	sessionLetter: string | null;
	sessionName: string | null;
	points: number;
	completedAtISO: string | null;
	isToday: boolean;
	/** Lien séance uniquement si sessionId connu */
	hrefSeance: string | null;
};

export type SportSessionRow = SportWeekStripEntry;

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, '/auth/login');
	}
	const userId = locals.user.id;

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { programStartDate: true }
	});

	const programStart = user?.programStartDate ?? null;
	const currentDayIndex = currentProgramDayIndex(programStart);
	const currentWeek = Math.min(
		TOTAL_PROGRAM_WEEKS,
		Math.max(1, Math.ceil(currentDayIndex / 7))
	);

	const rawSemaine = url.searchParams.get('semaine');
	let selectedWeek =
		rawSemaine != null && rawSemaine !== '' ? Number.parseInt(rawSemaine, 10) : NaN;
	if (!Number.isInteger(selectedWeek) || selectedWeek < 1 || selectedWeek > TOTAL_PROGRAM_WEEKS) {
		selectedWeek = currentWeek;
	}
	if (rawSemaine !== String(selectedWeek)) {
		const next = new URL(url);
		next.searchParams.set('semaine', String(selectedWeek));
		throw redirect(302, next.pathname + next.search);
	}

	const weekStart = (selectedWeek - 1) * 7 + 1;
	const weekEnd = Math.min(TOTAL_PROGRAM_DAYS, weekStart + 6);

	const program = await prisma.program.findFirst({
		where: { active: true },
		select: { id: true }
	});

	if (!program) {
		return serializeData({
			hasProgram: false,
			hasProgramStart: false,
			currentDayIndex,
			currentWeek,
			selectedWeek,
			weekStart,
			weekEnd,
			totalProgramDays: TOTAL_PROGRAM_DAYS,
			weekStrip: [] as SportWeekStripEntry[],
			sessionRows: [] as SportSessionRow[]
		});
	}

	const [userWorkoutRows, sessionCatalog] = await Promise.all([
		prisma.userWorkoutDay.findMany({
			where: {
				userId,
				dayIndex: { gte: weekStart, lte: weekEnd }
			},
			include: {
				session: { select: { id: true, name: true, type: true, active: true } }
			},
			orderBy: { dayIndex: 'asc' }
		}),
		prisma.workoutSession.findMany({
			where: {
				active: true,
				type: { in: [...PLANNER_SESSION_TYPES] }
			},
			select: {
				id: true,
				name: true,
				type: true,
				weekNumber: true,
				order: true
			},
			orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
		})
	]);

	const selectedSessions = [
		pickSessionForType(sessionCatalog, 'MAIN_A', selectedWeek),
		pickSessionForType(sessionCatalog, 'MAIN_B', selectedWeek),
		pickSessionForType(sessionCatalog, 'MAIN_C', selectedWeek),
		pickSessionForType(sessionCatalog, 'DISCOVERY', selectedWeek)
	].filter((session): session is SessionCatalogRow => session != null);

	const resolvedSlots = buildResolvedWeekSlots({
		weekStart,
		weekEnd,
		selectedSessions,
		userRows: userWorkoutRows as WeekUserWorkoutRow[]
	});

	const weekStrip: SportWeekStripEntry[] = [];

	for (let dayIndex = weekStart; dayIndex <= weekEnd; dayIndex++) {
		const slot = resolvedSlots.get(dayIndex) ?? { session: null, completedAt: null, isLocked: false };
		const sessionId = slot.session?.id ?? null;
		const completedAt = slot.completedAt;
		const letter = sessionTypeToLetter(slot.session?.type);
		const sessionName = slot.session?.name ?? null;
		const hasProgramSession = sessionId != null;

		let dateISO: string | null = null;
		let weekdayShort = '—';
		if (programStart) {
			const cal = calendarDateForProgramDay(programStart, dayIndex);
			dateISO = cal.toISOString().slice(0, 10);
			weekdayShort = shortWeekdayFrUtc(cal);
		}

		const hrefSeance =
			sessionId != null ? `/user/sport/seance/${sessionId}?day=${dayIndex}` : null;

		weekStrip.push({
			dayIndex,
			dateISO,
			weekdayShort,
			hasProgramSession,
			sessionId,
			sessionLetter: letter,
			sessionName,
			points: sessionId ? 50 : 0,
			completedAtISO: completedAt?.toISOString() ?? null,
			isToday: dayIndex === currentDayIndex,
			hrefSeance
		});
	}

	const sessionRows = weekStrip.filter((e) => e.hasProgramSession || e.sessionId);

	// Inject virtual D slot (Découverte) if no real DISCOVERY session is in DB
	if (!sessionRows.some((e) => e.sessionLetter === 'D')) {
		// Pick the last free day in the week (prefer end of week for the optional session)
		const occupiedDays = new Set(sessionRows.map((e) => e.dayIndex));
		let virtualDDay: number | null = null;
		for (let d = weekEnd; d >= weekStart; d--) {
			if (!occupiedDays.has(d)) {
				virtualDDay = d;
				break;
			}
		}
		// Fallback: last day of week even if occupied (shouldn't happen with 3 sessions / 7 days)
		if (virtualDDay == null) virtualDDay = weekEnd;

		let virtualDateISO: string | null = null;
		let virtualWeekdayShort = '—';
		if (programStart) {
			const cal = calendarDateForProgramDay(programStart, virtualDDay);
			virtualDateISO = cal.toISOString().slice(0, 10);
			virtualWeekdayShort = shortWeekdayFrUtc(cal);
		}

		sessionRows.push({
			dayIndex: virtualDDay,
			dateISO: virtualDateISO,
			weekdayShort: virtualWeekdayShort,
			hasProgramSession: true,
			sessionId: null,
			sessionLetter: 'D',
			sessionName: 'Découverte',
			points: 0,
			completedAtISO: null,
			isToday: virtualDDay === currentDayIndex,
			hrefSeance: '/user/decouverte'
		});
	}

	return serializeData({
		hasProgram: true,
		hasProgramStart: programStart !== null,
		currentDayIndex,
		currentWeek,
		selectedWeek,
		weekStart,
		weekEnd,
		totalProgramDays: TOTAL_PROGRAM_DAYS,
		weekStrip,
		sessionRows
	});
};

export const actions: Actions = {
	moveSession: async ({ locals, request }) => {
		if (!locals.user) return fail(401, { message: 'Non authentifié.' });
		await requireSportAccess(locals.user.id, locals.user.role);

		const formData = await request.formData();
		const sourceDayIndex = Number.parseInt(String(formData.get('sourceDayIndex') ?? ''), 10);
		const targetDayIndex = Number.parseInt(String(formData.get('targetDayIndex') ?? ''), 10);

		if (!Number.isInteger(sourceDayIndex) || !Number.isInteger(targetDayIndex)) {
			return fail(400, { message: 'Jour source/cible invalide.' });
		}
		if (sourceDayIndex < 1 || sourceDayIndex > 91 || targetDayIndex < 1 || targetDayIndex > 91) {
			return fail(400, { message: 'Jour hors plage du programme.' });
		}
		if (sourceDayIndex === targetDayIndex) {
			return fail(400, { message: 'Choisis un jour cible différent.' });
		}

		const sourceWeek = Math.ceil(sourceDayIndex / 7);
		const targetWeek = Math.ceil(targetDayIndex / 7);
		if (sourceWeek !== targetWeek) {
			return fail(400, {
				message: 'Déplace les séances à l’intérieur de la même semaine.'
			});
		}

		const weekStart = (sourceWeek - 1) * 7 + 1;
		const weekEnd = Math.min(TOTAL_PROGRAM_DAYS, weekStart + 6);

		const userId = locals.user.id;

		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { programStartDate: true }
		});

		const [sessionCatalog, userRows] = await Promise.all([
			prisma.workoutSession.findMany({
				where: {
					active: true,
					type: { in: [...PLANNER_SESSION_TYPES] }
				},
				select: {
					id: true,
					name: true,
					type: true,
					weekNumber: true,
					order: true
				},
				orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
			}),
			prisma.userWorkoutDay.findMany({
				where: {
					userId,
					dayIndex: { gte: weekStart, lte: weekEnd }
				},
				include: {
					session: { select: { id: true, name: true, type: true, active: true } }
				}
			})
		]);

		const selectedSessions = [
			pickSessionForType(sessionCatalog, 'MAIN_A', sourceWeek),
			pickSessionForType(sessionCatalog, 'MAIN_B', sourceWeek),
			pickSessionForType(sessionCatalog, 'MAIN_C', sourceWeek),
			pickSessionForType(sessionCatalog, 'DISCOVERY', sourceWeek)
		].filter((session): session is SessionCatalogRow => session != null);

		const resolvedByDay = buildResolvedWeekSlots({
			weekStart,
			weekEnd,
			selectedSessions,
			userRows: userRows as WeekUserWorkoutRow[]
		});

		const sourceResolved = resolvedByDay.get(sourceDayIndex) ?? null;
		const targetResolved = resolvedByDay.get(targetDayIndex) ?? null;
		const sourceResolvedSessionId = sourceResolved?.session?.id ?? null;
		const targetResolvedSessionId = targetResolved?.session?.id ?? null;

		if (!sourceResolvedSessionId) {
			return fail(400, { message: 'Aucune séance sur le jour source.' });
		}

		if (sourceResolved?.completedAt || targetResolved?.completedAt) {
			return fail(409, {
				message: 'Impossible de déplacer une séance déjà validée. Choisis deux jours non validés.'
			});
		}

		if (targetResolvedSessionId != null) {
			return fail(409, {
				message: 'Dépose la séance sur un jour libre.'
			});
		}

		const scheduledDateForDay = (dayIndex: number): Date | undefined => {
			if (!user?.programStartDate) return undefined;
			return startOfUtcDay(calendarDateForProgramDay(user.programStartDate, dayIndex));
		};

		await prisma.$transaction(async (tx) => {
			const nextWeekRows: Array<{
				dayIndex: number;
				sessionId: string | null;
				completedAt: Date | null;
				isLocked: boolean;
			}> = [];
			for (let dayIndex = weekStart; dayIndex <= weekEnd; dayIndex++) {
				const current = resolvedByDay.get(dayIndex) ?? {
					session: null,
					completedAt: null,
					isLocked: false
				};

				if (dayIndex === sourceDayIndex) {
					nextWeekRows.push({
						dayIndex,
						sessionId: null,
						completedAt: null,
						isLocked: false
					});
					continue;
				}

				if (dayIndex === targetDayIndex) {
					nextWeekRows.push({
						dayIndex,
						sessionId: sourceResolvedSessionId,
						completedAt: sourceResolved?.completedAt ?? null,
						isLocked: sourceResolved?.isLocked ?? false
					});
					continue;
				}

				nextWeekRows.push({
					dayIndex,
					sessionId: current.session?.id ?? null,
					completedAt: current.completedAt,
					isLocked: current.isLocked
				});
			}

			const selectedSessionIds = selectedSessions.map((session) => session.id);

			await tx.userWorkoutDay.deleteMany({
				where: {
					userId,
					dayIndex: { gte: weekStart, lte: weekEnd },
					sessionId: { in: selectedSessionIds }
				}
			});

			for (const row of nextWeekRows) {
				if (!row.sessionId) continue;

				await tx.userWorkoutDay.create({
					data: {
						userId,
						sessionId: row.sessionId,
						dayIndex: row.dayIndex,
						scheduledDate: scheduledDateForDay(row.dayIndex),
						completedAt: row.completedAt,
						isLocked: row.isLocked
					}
				});
			}
		});

		return {
			success: true,
			message: `Séance déplacée du jour ${sourceDayIndex} vers le jour ${targetDayIndex}.`
		};
	},

	startProgram: async ({ locals }) => {
		if (!locals.user) return fail(401, { message: 'Non authentifié.' });
		await requireSportAccess(locals.user.id, locals.user.role);

		const userId = locals.user.id;
		const existing = await prisma.user.findUnique({
			where: { id: userId },
			select: { programStartDate: true }
		});

		if (existing?.programStartDate != null) {
			return fail(409, { message: 'Programme déjà démarré.' });
		}

		await ensureProgramStartDate(userId);

		return { success: true };
	}
};
