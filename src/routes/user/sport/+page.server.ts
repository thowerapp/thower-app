import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server';
import type { WorkoutSessionType } from '@prisma/client';
import {
	calendarDateForProgramDay,
	currentProgramDayIndex,
	shortWeekdayFrUtc,
	TOTAL_PROGRAM_DAYS,
	TOTAL_PROGRAM_WEEKS
} from '$lib/utils/programDay';
import { serializeData } from '$lib/utils/serializeData';

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

	const [programDays, userWorkoutRows] = await Promise.all([
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
		})
	]);

	const programByDayIndex = new Map(programDays.map((d) => [d.dayIndex, d]));
	const uwdByDayIndex = new Map<number, (typeof userWorkoutRows)[number][]>();
	for (const row of userWorkoutRows) {
		const arr = uwdByDayIndex.get(row.dayIndex) ?? [];
		arr.push(row);
		uwdByDayIndex.set(row.dayIndex, arr);
	}

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

		const sessionId = programSessionId ?? matched?.sessionId ?? null;
		const completedAt = matched?.completedAt ?? null;
		const letter =
			sessionTypeToLetter(programSession?.type ?? matched?.session?.type) ??
			null;
		const sessionName =
			programSession?.name ?? matched?.session?.name ?? null;
		const hasProgramSession = !!sportItem;

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
			points: sportItem?.points ?? 0,
			completedAtISO: completedAt?.toISOString() ?? null,
			isToday: dayIndex === currentDayIndex,
			hrefSeance
		});
	}

	const sessionRows = weekStrip.filter((e) => e.hasProgramSession || e.sessionId);

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
