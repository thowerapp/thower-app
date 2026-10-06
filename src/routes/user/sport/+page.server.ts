import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { prisma } from '$lib/server';
import type { WorkoutSessionType } from '@prisma/client';
import {
	calendarDateForProgramDay,
	currentProgramDayIndex,
	programDayDateISO,
	programDayUtcDate,
	shortWeekdayFrUtc,
	sportWeekBounds,
	sportWeekCount,
	sportWeekNumberForDay,
	TOTAL_PROGRAM_DAYS
} from '$lib/utils/programDay';
import { serializeData } from '$lib/utils/serializeData';
import { requireSportAccess } from '$lib/server/programAccessGuard';
import { ensureProgramStartDate } from '$lib/server/program-generation/generateProgramForUser';
import { resolveSportWeek } from '$lib/server/sport/programSportDays';

function sessionTypeToLetter(t: WorkoutSessionType | null | undefined): string | null {
	if (!t) return null;
	if (t === 'MAIN_A') return '1';
	if (t === 'MAIN_B') return '2';
	if (t === 'MAIN_C') return '3';
	if (t === 'DISCOVERY') return 'D';
	return null;
}

export type SportWeekStripEntry = {
	/** Peut être ≤ 0 ou > 91 pour les jours hors programme affichés en début/fin de semaine */
	dayIndex: number;
	/** Jour hors du programme (avant J1 ou après J91) : affiché grisé, non interactif */
	outOfProgram: boolean;
	/** yyyy-mm-dd (calendrier Europe/Paris) pour afficher le numéro du jour civil */
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

	// `program` ne dépend pas de `user` : on les lance ensemble.
	const [user, program] = await Promise.all([
		prisma.user.findUnique({
			where: { id: userId },
			select: { programStartDate: true }
		}),
		prisma.program.findFirst({ where: { active: true }, select: { id: true } })
	]);

	const programStart = user?.programStartDate ?? null;
	const currentDayIndex = currentProgramDayIndex(programStart);
	const totalWeeks = sportWeekCount(programStart);
	const currentWeek = sportWeekNumberForDay(programStart, currentDayIndex);

	const rawSemaine = url.searchParams.get('semaine');
	let selectedWeek =
		rawSemaine != null && rawSemaine !== '' ? Number.parseInt(rawSemaine, 10) : NaN;
	if (!Number.isInteger(selectedWeek) || selectedWeek < 1 || selectedWeek > totalWeeks) {
		selectedWeek = currentWeek;
	}
	if (rawSemaine !== String(selectedWeek)) {
		const next = new URL(url);
		next.searchParams.set('semaine', String(selectedWeek));
		throw redirect(302, next.pathname + next.search);
	}

	const { mondayDayIndex, weekStart, weekEnd } = sportWeekBounds(programStart, selectedWeek);

	if (!program) {
		return serializeData({
			hasProgram: false,
			hasProgramStart: false,
			currentDayIndex,
			currentWeek,
			totalWeeks,
			selectedWeek,
			weekStart,
			weekEnd,
			totalProgramDays: TOTAL_PROGRAM_DAYS,
			weekStrip: [] as SportWeekStripEntry[],
			sessionRows: [] as SportSessionRow[],
			hasSportThisWeek: false
		});
	}

	// Séances = jours où l'admin a rattaché des vidéos sport (déplaçables par l'utilisateur).
	const { slots: resolvedSlots } = await resolveSportWeek({
		userId,
		programStart,
		week: selectedWeek
	});

	const weekStrip: SportWeekStripEntry[] = [];

	for (let dayIndex = mondayDayIndex; dayIndex <= mondayDayIndex + 6; dayIndex++) {
		const outOfProgram = dayIndex < weekStart || dayIndex > weekEnd;
		const slot = outOfProgram ? undefined : resolvedSlots.get(dayIndex);
		const sessionId = slot?.session.id ?? null;
		const completedAt = slot?.completedAt ?? null;
		const letter = sessionTypeToLetter(slot?.session.type);
		const sessionName = slot?.session.name ?? null;
		const hasProgramSession = sessionId != null;

		let dateISO: string | null = null;
		let weekdayShort = '—';
		if (programStart) {
			dateISO = programDayDateISO(programStart, dayIndex);
			weekdayShort = shortWeekdayFrUtc(calendarDateForProgramDay(programStart, dayIndex));
		}

		const hrefSeance =
			sessionId != null
				? `/user/sport/seance/${sessionId}?day=${dayIndex}&semaine=${selectedWeek}`
				: null;

		weekStrip.push({
			dayIndex,
			outOfProgram,
			dateISO,
			weekdayShort,
			hasProgramSession,
			sessionId,
			sessionLetter: letter,
			sessionName,
			points: sessionId ? 50 : 0,
			completedAtISO: completedAt?.toISOString() ?? null,
			isToday: !outOfProgram && dayIndex === currentDayIndex,
			hrefSeance
		});
	}

	const sessionRows = weekStrip.filter((e) => e.hasProgramSession || e.sessionId);
	const hasSportThisWeek = sessionRows.length > 0;

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
		// Semaine partielle (début/fin de programme) sans jour libre : pas de créneau D.
		if (virtualDDay != null) {
			let virtualDateISO: string | null = null;
			let virtualWeekdayShort = '—';
			if (programStart) {
				virtualDateISO = programDayDateISO(programStart, virtualDDay);
				virtualWeekdayShort = shortWeekdayFrUtc(
					calendarDateForProgramDay(programStart, virtualDDay)
				);
			}

			sessionRows.push({
				dayIndex: virtualDDay,
				outOfProgram: false,
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
	}

	return serializeData({
		hasProgram: true,
		hasProgramStart: programStart !== null,
		currentDayIndex,
		currentWeek,
		totalWeeks,
		selectedWeek,
		weekStart,
		weekEnd,
		totalProgramDays: TOTAL_PROGRAM_DAYS,
		weekStrip,
		sessionRows,
		hasSportThisWeek
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

		const userId = locals.user.id;
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { programStartDate: true }
		});
		const programStart = user?.programStartDate ?? null;

		const sourceWeek = sportWeekNumberForDay(programStart, sourceDayIndex);
		const targetWeek = sportWeekNumberForDay(programStart, targetDayIndex);
		if (sourceWeek !== targetWeek) {
			return fail(400, {
				message: 'Déplace les séances à l’intérieur de la même semaine.'
			});
		}

		const { slots } = await resolveSportWeek({ userId, programStart, week: sourceWeek });
		const sourceSlot = slots.get(sourceDayIndex) ?? null;
		const targetSlot = slots.get(targetDayIndex) ?? null;

		if (!sourceSlot) {
			return fail(400, { message: 'Aucune séance sur le jour source.' });
		}

		if (sourceSlot.completedAt) {
			return fail(409, {
				message: 'Impossible de déplacer une séance déjà validée. Choisis deux jours non validés.'
			});
		}

		if (targetSlot) {
			return fail(409, {
				message: 'Dépose la séance sur un jour libre.'
			});
		}

		const scheduledDate = programStart ? programDayUtcDate(programStart, targetDayIndex) : undefined;

		// La séance garde les vidéos de son jour source (contentDayIndex) en changeant de jour.
		await prisma.$transaction(async (tx) => {
			// Ligne non validée restée sur le jour cible (ancien placement) : bloquerait la clé unique.
			await tx.userWorkoutDay.deleteMany({
				where: {
					userId,
					sessionId: sourceSlot.session.id,
					dayIndex: targetDayIndex,
					completedAt: null,
					...(sourceSlot.userWorkoutDayId ? { id: { not: sourceSlot.userWorkoutDayId } } : {})
				}
			});

			if (sourceSlot.userWorkoutDayId) {
				await tx.userWorkoutDay.update({
					where: { id: sourceSlot.userWorkoutDayId },
					data: {
						dayIndex: targetDayIndex,
						contentDayIndex: sourceSlot.contentDayIndex,
						scheduledDate
					}
				});
			} else {
				await tx.userWorkoutDay.create({
					data: {
						userId,
						sessionId: sourceSlot.session.id,
						dayIndex: targetDayIndex,
						contentDayIndex: sourceSlot.contentDayIndex,
						scheduledDate,
						completedAt: null,
						isLocked: false
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
