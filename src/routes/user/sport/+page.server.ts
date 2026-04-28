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

const PLANNER_SESSION_TYPES = ['MAIN_A', 'MAIN_B', 'MAIN_C', 'DISCOVERY'] as const;

type PlannerSessionType = (typeof PLANNER_SESSION_TYPES)[number];

type SessionCatalogRow = {
	id: string;
	name: string;
	type: WorkoutSessionType;
	weekNumber: number | null;
	order: number;
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

export type SportPlannerSession = {
	sessionId: string;
	sessionLetter: string | null;
	sessionName: string;
	sessionType: WorkoutSessionType;
	optional: boolean;
	currentDayIndex: number | null;
	completedAtISO: string | null;
	points: number;
};

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

	const [programDays, userWorkoutRows, sessionCatalog] = await Promise.all([
		prisma.programDay.findMany({
			where: {
				programId: program.id,
				dayIndex: { gte: weekStart, lte: weekEnd }
			},
			include: {
				items: {
					where: { type: 'SPORT_SESSION' },
					orderBy: { order: 'asc' },
					include: {
						workoutSession: { select: { id: true, name: true, type: true } }
					}
				}
			}
		}),
		prisma.userWorkoutDay.findMany({
			where: {
				userId,
				dayIndex: { gte: weekStart, lte: weekEnd }
			},
			include: {
				session: { select: { id: true, name: true, type: true } }
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

	const programByDayIndex = new Map(programDays.map((d) => [d.dayIndex, d]));
	const baseSessionDayCount = programDays.filter((day) => day.items?.[0]?.workoutSession?.id != null).length;
	const uwdByDayIndex = new Map<number, (typeof userWorkoutRows)[number][]>();
	for (const row of userWorkoutRows) {
		const arr = uwdByDayIndex.get(row.dayIndex) ?? [];
		arr.push(row);
		uwdByDayIndex.set(row.dayIndex, arr);
	}
	const explicitDayCount = new Set(userWorkoutRows.map((row) => row.dayIndex)).size;
	const hasAuthoritativeWeekSchedule =
		baseSessionDayCount > 0 && explicitDayCount >= baseSessionDayCount;

	const weekStrip: SportWeekStripEntry[] = [];

	for (let dayIndex = weekStart; dayIndex <= weekEnd; dayIndex++) {
		const pd = programByDayIndex.get(dayIndex);
		const sportItem = pd?.items?.[0];
		const programSession = sportItem?.workoutSession;
		const programSessionId = programSession?.id ?? null;

		const userList = uwdByDayIndex.get(dayIndex) ?? [];
		/** Priorité : ligne utilisateur qui matche la séance catalogue ; sinon première ligne du jour. */
		const matched = programSessionId
			? userList.find((u) => u.sessionId === programSessionId) ?? userList[0]
			: userList[0];

		const resolvedRow = hasAuthoritativeWeekSchedule ? userList[0] ?? null : matched;
		const sessionId = hasAuthoritativeWeekSchedule
			? resolvedRow?.sessionId ?? null
			: resolvedRow?.sessionId ?? programSessionId;
		const completedAt = resolvedRow?.completedAt ?? null;
		const letter =
			sessionTypeToLetter(resolvedRow?.session?.type ?? programSession?.type) ?? null;
		const sessionName = resolvedRow?.session?.name ?? programSession?.name ?? null;
		const hasProgramSession = hasAuthoritativeWeekSchedule ? sessionId != null : !!sportItem;

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
			points: (sportItem?.points ?? 0) || (sessionId ? 50 : 0),
			completedAtISO: completedAt?.toISOString() ?? null,
			isToday: dayIndex === currentDayIndex,
			hrefSeance
		});
	}

	const sessionRows = weekStrip.filter((e) => e.hasProgramSession || e.sessionId);
	const selectedSessions = [
		pickSessionForType(sessionCatalog, 'MAIN_A', selectedWeek),
		pickSessionForType(sessionCatalog, 'MAIN_B', selectedWeek),
		pickSessionForType(sessionCatalog, 'MAIN_C', selectedWeek),
		pickSessionForType(sessionCatalog, 'DISCOVERY', selectedWeek)
	].filter((session): session is SessionCatalogRow => session != null);

	const placementBySessionId = new Map(
		weekStrip
			.filter((entry) => entry.sessionId != null)
			.map((entry) => [entry.sessionId as string, entry])
	);

	const plannerSessions: SportPlannerSession[] = selectedSessions.map((session) => {
		const placement = placementBySessionId.get(session.id);
		return {
			sessionId: session.id,
			sessionLetter: sessionTypeToLetter(session.type),
			sessionName: session.name,
			sessionType: session.type,
			optional: session.type === 'DISCOVERY',
			currentDayIndex: placement?.dayIndex ?? null,
			completedAtISO: placement?.completedAtISO ?? null,
			points: placement?.points ?? 50
		};
	});

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
		sessionRows,
		plannerSessions
	});
};

export const actions: Actions = {
	saveWeekPlan: async ({ locals, request }) => {
		if (!locals.user) return fail(401, { message: 'Non authentifié.' });
		await requireSportAccess(locals.user.id, locals.user.role);

		const formData = await request.formData();
		const selectedWeek = Number.parseInt(String(formData.get('selectedWeek') ?? ''), 10);
		const rawPlacements = String(formData.get('placements') ?? '[]');

		if (!Number.isInteger(selectedWeek) || selectedWeek < 1 || selectedWeek > TOTAL_PROGRAM_WEEKS) {
			return fail(400, { message: 'Semaine invalide.' });
		}

		let placements: Array<{ sessionId: string; dayIndex: number | null }> = [];
		try {
			const parsed = JSON.parse(rawPlacements);
			if (!Array.isArray(parsed)) throw new Error('invalid placements');
			placements = parsed.map((item) => ({
				sessionId: String(item?.sessionId ?? ''),
				dayIndex:
					item?.dayIndex == null || item?.dayIndex === ''
						? null
						: Number.parseInt(String(item.dayIndex), 10)
			}));
		} catch {
			return fail(400, { message: 'Placement hebdomadaire invalide.' });
		}

		const weekStart = (selectedWeek - 1) * 7 + 1;
		const weekEnd = Math.min(TOTAL_PROGRAM_DAYS, weekStart + 6);
		const userId = locals.user.id;

		const [user, sessionCatalog, userRows] = await Promise.all([
			prisma.user.findUnique({
				where: { id: userId },
				select: { programStartDate: true }
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
			}),
			prisma.userWorkoutDay.findMany({
				where: {
					userId,
					dayIndex: { gte: weekStart, lte: weekEnd }
				},
				include: {
					session: { select: { id: true, type: true } }
				}
			})
		]);

		const plannerSessions = [
			pickSessionForType(sessionCatalog, 'MAIN_A', selectedWeek),
			pickSessionForType(sessionCatalog, 'MAIN_B', selectedWeek),
			pickSessionForType(sessionCatalog, 'MAIN_C', selectedWeek),
			pickSessionForType(sessionCatalog, 'DISCOVERY', selectedWeek)
		].filter((session): session is SessionCatalogRow => session != null);

		const mandatorySessionIds = plannerSessions
			.filter((session) => session.type !== 'DISCOVERY')
			.map((session) => session.id);
		const allowedSessionIds = new Set(plannerSessions.map((session) => session.id));

		const fixedCompletedRows = userRows.filter((row) => row.completedAt != null);
		const fixedBySessionId = new Map(fixedCompletedRows.map((row) => [row.sessionId, row]));

		const usedDays = new Set<number>();
		const desiredAssignments = new Map<
			string,
			{ dayIndex: number; completedAt: Date | null; isLocked: boolean }
		>();

		for (const row of fixedCompletedRows) {
			usedDays.add(row.dayIndex);
			desiredAssignments.set(row.sessionId, {
				dayIndex: row.dayIndex,
				completedAt: row.completedAt,
				isLocked: row.isLocked
			});
		}

		for (const placement of placements) {
			if (!allowedSessionIds.has(placement.sessionId)) {
				return fail(400, { message: 'Séance non autorisée dans ce planning.' });
			}
			if (fixedBySessionId.has(placement.sessionId)) {
				return fail(409, { message: 'Une séance déjà validée ne peut plus être déplacée.' });
			}
			if (placement.dayIndex == null) continue;
			if (
				!Number.isInteger(placement.dayIndex) ||
				placement.dayIndex < weekStart ||
				placement.dayIndex > weekEnd
			) {
				return fail(400, { message: 'Jour de placement hors de la semaine sélectionnée.' });
			}
			if (usedDays.has(placement.dayIndex)) {
				return fail(409, { message: 'Deux séances ne peuvent pas partager le même jour.' });
			}
			usedDays.add(placement.dayIndex);
			desiredAssignments.set(placement.sessionId, {
				dayIndex: placement.dayIndex,
				completedAt: null,
				isLocked: false
			});
		}

		for (const sessionId of mandatorySessionIds) {
			if (!desiredAssignments.has(sessionId)) {
				return fail(400, {
					message: 'Place les 3 séances obligatoires avant de valider ton organisation.'
				});
			}
		}

		const scheduledDateForDay = (dayIndex: number): Date | undefined => {
			if (!user?.programStartDate) return undefined;
			return startOfUtcDay(calendarDateForProgramDay(user.programStartDate, dayIndex));
		};

		await prisma.$transaction(async (tx) => {
			await tx.userWorkoutDay.deleteMany({
				where: {
					userId,
					dayIndex: { gte: weekStart, lte: weekEnd }
				}
			});

			for (const [sessionId, assignment] of desiredAssignments) {
				await tx.userWorkoutDay.create({
					data: {
						userId,
						sessionId,
						dayIndex: assignment.dayIndex,
						scheduledDate: scheduledDateForDay(assignment.dayIndex),
						completedAt: assignment.completedAt,
						isLocked: assignment.isLocked
					}
				});
			}
		});

		return {
			success: true,
			message: 'Organisation de la semaine enregistrée.'
		};
	},
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

		const program = await prisma.program.findFirst({
			where: { active: true },
			select: { id: true }
		});
		if (!program) {
			return fail(404, { message: 'Programme introuvable.' });
		}

		const [programDays, userRows] = await Promise.all([
			prisma.programDay.findMany({
				where: {
					programId: program.id,
					dayIndex: { gte: weekStart, lte: weekEnd }
				},
				include: {
					items: {
						where: { type: 'SPORT_SESSION' },
						orderBy: { order: 'asc' },
						include: {
							workoutSession: { select: { id: true, name: true } }
						}
					}
				}
			}),
			prisma.userWorkoutDay.findMany({
				where: {
					userId,
					dayIndex: { gte: weekStart, lte: weekEnd }
				},
				include: {
					session: { select: { id: true, name: true } }
				}
			})
		]);

		const baseSessionByDay = new Map<number, string | null>();
		for (const pd of programDays) {
			baseSessionByDay.set(pd.dayIndex, pd.items?.[0]?.workoutSession?.id ?? null);
		}
		const baseSessionDayCount = programDays.filter((day) => day.items?.[0]?.workoutSession?.id != null).length;

		const rowsByDay = new Map<number, (typeof userRows)>();
		for (const row of userRows) {
			const current = rowsByDay.get(row.dayIndex) ?? [];
			current.push(row);
			rowsByDay.set(row.dayIndex, current);
		}
		const explicitDayCount = new Set(userRows.map((row) => row.dayIndex)).size;
		const hasAuthoritativeWeekSchedule =
			baseSessionDayCount > 0 && explicitDayCount >= baseSessionDayCount;

		type ResolvedDay = {
			dayIndex: number;
			sessionId: string | null;
			completedAt: Date | null;
			isLocked: boolean;
		};

		const resolvedByDay = new Map<number, ResolvedDay>();
		for (let dayIndex = weekStart; dayIndex <= weekEnd; dayIndex++) {
			const dayRows = rowsByDay.get(dayIndex) ?? [];
			const explicitRow = dayRows[0] ?? null;
			const baseSessionId = baseSessionByDay.get(dayIndex) ?? null;
			const resolvedSessionId = hasAuthoritativeWeekSchedule
				? explicitRow?.sessionId ?? null
				: explicitRow?.sessionId ?? baseSessionId;

			resolvedByDay.set(dayIndex, {
				dayIndex,
				sessionId: resolvedSessionId,
				completedAt: explicitRow?.completedAt ?? null,
				isLocked: explicitRow?.isLocked ?? false
			});
		}

		const sourceResolved = resolvedByDay.get(sourceDayIndex) ?? null;
		const targetResolved = resolvedByDay.get(targetDayIndex) ?? null;
		const sourceResolvedSessionId = sourceResolved?.sessionId ?? null;
		const targetResolvedSessionId = targetResolved?.sessionId ?? null;

		if (!sourceResolvedSessionId) {
			return fail(400, { message: 'Aucune séance sur le jour source.' });
		}

		if (sourceResolved?.completedAt || targetResolved?.completedAt) {
			return fail(409, {
				message: 'Impossible de déplacer une séance déjà validée. Choisis deux jours non validés.'
			});
		}

		if (sourceResolvedSessionId === targetResolvedSessionId) {
			return fail(400, { message: 'Ces deux jours ont déjà la même séance.' });
		}

		const sourceBaseSessionId = baseSessionByDay.get(sourceDayIndex) ?? null;
		const targetBaseSessionId = baseSessionByDay.get(targetDayIndex) ?? null;

		const scheduledDateForDay = (dayIndex: number): Date | undefined => {
			if (!user?.programStartDate) return undefined;
			return startOfUtcDay(calendarDateForProgramDay(user.programStartDate, dayIndex));
		};

		await prisma.$transaction(async (tx) => {
			const nextWeekRows: ResolvedDay[] = [];
			for (let dayIndex = weekStart; dayIndex <= weekEnd; dayIndex++) {
				const current = resolvedByDay.get(dayIndex) ?? {
					dayIndex,
					sessionId: null,
					completedAt: null,
					isLocked: false
				};

				if (dayIndex === sourceDayIndex) {
					nextWeekRows.push({
						dayIndex,
						sessionId: targetResolvedSessionId,
						completedAt: targetResolved?.completedAt ?? null,
						isLocked: targetResolved?.isLocked ?? false
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

				nextWeekRows.push(current);
			}

			await tx.userWorkoutDay.deleteMany({
				where: {
					userId,
					dayIndex: { gte: weekStart, lte: weekEnd }
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
	}
};
