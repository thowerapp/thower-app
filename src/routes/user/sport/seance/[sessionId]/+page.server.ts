import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { prisma } from '$lib/server';
import {
	calendarDateForProgramDay,
	currentProgramDayIndex,
	startOfUtcDay
} from '$lib/utils/programDay';
import { serializeData } from '$lib/utils/serializeData';
import { requireSportAccess } from '$lib/server/programAccessGuard';
import { VIDEO_COMPLETION_THRESHOLD } from '$lib/prisma/userVideoProgress/upsertProgress';
import { createPointEvent } from '$lib/prisma/pointEvent/createEvent';
import { getWorkoutVideosForSessionType } from '$lib/prisma/workoutSession/getWorkoutVideosForSessionType';
import type { WorkoutSessionType } from '@prisma/client';

const OID = /^[a-f\d]{24}$/i;
const WORKOUT_COMPLETION_POINTS = 50;
const PLANNER_SESSION_TYPES = ['MAIN_A', 'MAIN_B', 'MAIN_C', 'DISCOVERY'] as const;

type PlannerSessionType = (typeof PLANNER_SESSION_TYPES)[number];

type SessionCatalogRow = {
	id: string;
	name: string;
	type: WorkoutSessionType;
	weekNumber: number | null;
	order: number;
};

const levels = [
	{ min: 0, num: 1, name: 'Bambou en herbe', nextMin: 200 },
	{ min: 200, num: 2, name: 'Bambou Furieux', nextMin: 500 },
	{ min: 500, num: 3, name: 'Guerrier en devenir', nextMin: 1000 },
	{ min: 1000, num: 4, name: 'Guerrier Thower', nextMin: 2000 },
	{ min: 2000, num: 5, name: 'Maître Thower', nextMin: null }
] as const;

type VideoProgressState = 'preparing' | 'not_started' | 'in_progress' | 'validated';

function getUserVideoProgressDelegate(): {
	findMany: (args: unknown) => Promise<unknown[]>;
	count: (args: unknown) => Promise<number>;
} | null {
	const maybeDelegate = (
		prisma as unknown as {
			userVideoProgress?: {
				findMany?: (args: unknown) => Promise<unknown[]>;
				count?: (args: unknown) => Promise<number>;
			};
		}
	).userVideoProgress;

	if (!maybeDelegate?.findMany || !maybeDelegate?.count) return null;
	return {
		findMany: maybeDelegate.findMany,
		count: maybeDelegate.count
	};
}

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

async function resolveSessionIdForDay(userId: string, dayIndex: number): Promise<string | null> {
	const selectedWeek = Math.max(1, Math.min(13, Math.ceil(dayIndex / 7)));
	const weekStart = (selectedWeek - 1) * 7 + 1;
	const weekEnd = Math.min(91, weekStart + 6);

	const sessionCatalog = await prisma.workoutSession.findMany({
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
	});

	const selectedSessions = [
		pickSessionForType(sessionCatalog, 'MAIN_A', selectedWeek),
		pickSessionForType(sessionCatalog, 'MAIN_B', selectedWeek),
		pickSessionForType(sessionCatalog, 'MAIN_C', selectedWeek),
		pickSessionForType(sessionCatalog, 'DISCOVERY', selectedWeek)
	].filter((session): session is SessionCatalogRow => session != null);

	if (selectedSessions.length === 0) return null;

	const selectedIds = new Set(selectedSessions.map((session) => session.id));
	const userRows = await prisma.userWorkoutDay.findMany({
		where: {
			userId,
			dayIndex: { gte: weekStart, lte: weekEnd },
			sessionId: { in: [...selectedIds] }
		},
		include: {
			session: { select: { id: true, active: true } }
		}
	});

	const direct = userRows.find(
		(row) => row.dayIndex === dayIndex && row.session?.active && selectedIds.has(row.sessionId)
	);
	if (direct) return direct.sessionId;

	const resolvedByDay = new Map<number, string>();
	const usedDays = new Set<number>();
	const placedSessionIds = new Set<string>();

	const prioritizedRows = userRows
		.filter((row) => row.session?.active && selectedIds.has(row.sessionId))
		.sort((a, b) => {
			const aCompleted = a.completedAt != null ? 1 : 0;
			const bCompleted = b.completedAt != null ? 1 : 0;
			if (aCompleted !== bCompleted) return bCompleted - aCompleted;
			return a.dayIndex - b.dayIndex;
		});

	const bestRowBySession = new Map<string, (typeof prioritizedRows)[number]>();
	for (const row of prioritizedRows) {
		if (!bestRowBySession.has(row.sessionId)) bestRowBySession.set(row.sessionId, row);
	}

	for (const row of bestRowBySession.values()) {
		if (row.dayIndex < weekStart || row.dayIndex > weekEnd) continue;
		if (usedDays.has(row.dayIndex)) continue;
		resolvedByDay.set(row.dayIndex, row.sessionId);
		usedDays.add(row.dayIndex);
		placedSessionIds.add(row.sessionId);
	}

	const remainingSessions = selectedSessions.filter((session) => !placedSessionIds.has(session.id));
	const preferredDays = [weekStart, weekStart + 2, weekStart + 4, weekStart + 6].filter(
		(day) => day <= weekEnd
	);

	for (let i = 0; i < remainingSessions.length; i++) {
		const session = remainingSessions[i];
		let targetDay: number | null = null;
		const preferred = preferredDays[i];

		if (preferred != null && !usedDays.has(preferred)) {
			targetDay = preferred;
		} else {
			for (let idx = weekStart; idx <= weekEnd; idx++) {
				if (!usedDays.has(idx)) {
					targetDay = idx;
					break;
				}
			}
		}

		if (targetDay == null) break;
		resolvedByDay.set(targetDay, session.id);
		usedDays.add(targetDay);
	}

	return resolvedByDay.get(dayIndex) ?? null;
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	if (!locals.user) throw redirect(302, '/auth/login');

	const requestedSessionId = params.sessionId;

	const userId = locals.user.id;

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { programStartDate: true }
	});
	const pointEvents = await prisma.pointEvent.findMany({
		where: { userId },
		select: { amount: true }
	});

	const rawDay = url.searchParams.get('day');
	const currentUnlockedDayIndex = currentProgramDayIndex(user?.programStartDate ?? null);
	let dayIndex =
		rawDay != null && rawDay !== ''
			? Number.parseInt(rawDay, 10)
			: currentProgramDayIndex(user?.programStartDate ?? null);
	if (!Number.isInteger(dayIndex) || dayIndex < 1 || dayIndex > 91) {
		dayIndex = currentProgramDayIndex(user?.programStartDate ?? null);
	}

	let sessionId = requestedSessionId;
	let session = OID.test(sessionId)
		? await prisma.workoutSession.findUnique({ where: { id: sessionId } })
		: null;

	if (!session || !session.active) {
		const fallbackSessionId = await resolveSessionIdForDay(userId, dayIndex);
		if (fallbackSessionId && fallbackSessionId !== requestedSessionId) {
			throw redirect(302, `/user/sport/seance/${fallbackSessionId}?day=${dayIndex}`);
		}
		if (fallbackSessionId && OID.test(fallbackSessionId)) {
			sessionId = fallbackSessionId;
			session = await prisma.workoutSession.findUnique({ where: { id: sessionId } });
		}
	}

	if (!session || !session.active) {
		throw error(404, 'Séance introuvable.');
	}

	const sessionVideos = await getWorkoutVideosForSessionType(session.type);
	const videoIds = sessionVideos.map((v) => v.id);
	const progressDelegate = getUserVideoProgressDelegate();

	const [userDay, progressRows] = await Promise.all([
		prisma.userWorkoutDay.findFirst({
			where: { userId, sessionId, dayIndex },
			select: {
				id: true,
				completedAt: true,
				isLocked: true,
				dayIndex: true
			}
		}),
		videoIds.length > 0 && progressDelegate
			? progressDelegate.findMany({
					where: { userId, workoutVideoId: { in: videoIds } },
					select: {
						workoutVideoId: true,
						completedAt: true,
						maxPositionSec: true
					}
				})
			: Promise.resolve([])
	]);

	const progressByVideoId = new Map<
		string,
		{ completedAt: Date | null; maxPositionSec: number }
	>();
	for (const r of progressRows as {
		workoutVideoId: string | null;
		completedAt: Date | null;
		maxPositionSec: number;
	}[]) {
		if (r.workoutVideoId) {
			progressByVideoId.set(r.workoutVideoId, {
				completedAt: r.completedAt,
				maxPositionSec: r.maxPositionSec ?? 0
			});
		}
	}

	const validationThresholdPercent = Math.round(VIDEO_COMPLETION_THRESHOLD * 100);

	let scheduledISO: string | null = null;
	const ps = user?.programStartDate;
	if (ps) {
		scheduledISO = calendarDateForProgramDay(ps, dayIndex).toISOString();
	}

	const orderedSessionVideos = sessionVideos;

	const videos = orderedSessionVideos.map((v) => {
		const isOptional = session.type !== 'DISCOVERY' && v.position === 'PRE';
		const status = v.status ?? 'pending';
		const prog = progressByVideoId.get(v.id);
		const videoCompleted = prog?.completedAt != null;
		const maxPositionSec = prog?.maxPositionSec ?? 0;
		const durationSec = v.durationSeconds != null && v.durationSeconds > 0 ? v.durationSeconds : null;

		let progressState: VideoProgressState;
		if (status !== 'ready') {
			progressState = 'preparing';
		} else if (videoCompleted) {
			progressState = 'validated';
		} else if (maxPositionSec > 0) {
			progressState = 'in_progress';
		} else {
			progressState = 'not_started';
		}

		const watchedPercent =
			durationSec != null
				? Math.min(100, Math.round((maxPositionSec / durationSec) * 100))
				: null;

		return {
			id: v.id,
			title: v.title,
			position: v.position,
			order: v.order,
			status,
			cloudflareUid: v.cloudflareUid,
			isOptional,
			isRequired: !isOptional,
			videoCompleted,
			progressState,
			maxPositionSec: Math.round(maxPositionSec * 10) / 10,
			durationSeconds: v.durationSeconds ?? null,
			watchedPercent
		};
	});

	const mandatoryVideos = orderedSessionVideos.filter(
		(v) => session.type === 'DISCOVERY' || v.position !== 'PRE'
	);
	const optionalVideos = orderedSessionVideos.filter(
		(v) => session.type !== 'DISCOVERY' && v.position === 'PRE'
	);
	const allMandatoryVideosCompleted =
		mandatoryVideos.length === 0 ||
		mandatoryVideos.every((v) => progressByVideoId.get(v.id)?.completedAt != null);

	const mandatoryValidated = mandatoryVideos.filter(
		(v) => progressByVideoId.get(v.id)?.completedAt != null
	).length;
	const optionalValidated = optionalVideos.filter(
		(v) => progressByVideoId.get(v.id)?.completedAt != null
	).length;
	const totalPoints = pointEvents.reduce((sum, event) => sum + event.amount, 0);
	const levelData = levels.slice().reverse().find((level) => totalPoints >= level.min) ?? levels[0];
	const levelPercent =
		levelData.nextMin != null
			? Math.round(((totalPoints - levelData.min) / (levelData.nextMin - levelData.min)) * 100)
			: 100;
	const canWatchSession = dayIndex <= currentUnlockedDayIndex;

	// Ordre A→B→C : vérifier que la séance prérequise est validée
	let prerequisiteBlocked = false;
	let prerequisiteMessage: string | null = null;
	if (session.type === 'MAIN_B' || session.type === 'MAIN_C') {
		const requiredPrevType = session.type === 'MAIN_B' ? 'MAIN_A' : 'MAIN_B';
		const prevCompleted = await prisma.userWorkoutDay.findFirst({
			where: { userId, completedAt: { not: null }, session: { type: requiredPrevType } }
		});
		if (!prevCompleted) {
			prerequisiteBlocked = true;
			prerequisiteMessage =
				session.type === 'MAIN_B'
					? 'Valide la séance A avant d\'accéder à la séance B.'
					: 'Valide la séance B avant d\'accéder à la séance C.';
		}
	}

	return serializeData({
		sessionId,
		sessionName: session.name,
		sessionType: session.type,
		dayIndex,
		currentUnlockedDayIndex,
		canWatchSession,
		canValidateSession: dayIndex <= currentUnlockedDayIndex && !prerequisiteBlocked,
		prerequisiteBlocked,
		prerequisiteMessage,
		scheduledDateISO: scheduledISO,
		seanceCompletedAt: userDay?.completedAt?.toISOString() ?? null,
		seanceLocked: userDay?.isLocked ?? false,
		userDayExists: !!userDay,
		videos,
		allMandatoryVideosCompleted,
		validationThresholdPercent,
		totalPoints,
		levelData,
		levelPercent,
		workoutCompletionPoints: WORKOUT_COMPLETION_POINTS,
		seanceVideoSummary: {
			mandatoryValidated,
			mandatoryTotal: mandatoryVideos.length,
			optionalValidated,
			optionalTotal: optionalVideos.length
		}
	});
};

export const actions: Actions = {
	markCompleted: async ({ locals, params, request }) => {
		if (!locals.user) return fail(401, { message: 'Non authentifié.' });
		await requireSportAccess(locals.user.id, locals.user.role);
		const sessionId = params.sessionId;
		if (!OID.test(sessionId)) return fail(400, { message: 'Identifiant invalide.' });

		const fd = await request.formData();
		const raw = fd.get('dayIndex');
		const dayIdx =
			raw != null && raw !== ''
				? Number.parseInt(String(raw), 10)
				: NaN;
		if (!Number.isInteger(dayIdx) || dayIdx < 1 || dayIdx > 91) {
			return fail(400, { message: 'Jour programme invalide.' });
		}

		const userId = locals.user.id;
		const now = new Date();

		const session = await prisma.workoutSession.findUnique({
			where: { id: sessionId },
			select: { id: true, active: true, type: true, name: true }
		});
		if (!session?.active) return fail(404, { message: 'Séance introuvable.' });

		const sessionVideos = await getWorkoutVideosForSessionType(session.type);

		const existingWorkoutDay = await prisma.userWorkoutDay.findFirst({
			where: { userId, sessionId, dayIndex: dayIdx },
			select: { completedAt: true }
		});
		if (existingWorkoutDay?.completedAt) {
			return fail(409, { message: 'Cette séance est déjà validée.' });
		}

		// Ordre A→B→C
		if (session.type === 'MAIN_B' || session.type === 'MAIN_C') {
			const requiredPrevType = session.type === 'MAIN_B' ? 'MAIN_A' : 'MAIN_B';
			const prevCompleted = await prisma.userWorkoutDay.findFirst({
				where: { userId, completedAt: { not: null }, session: { type: requiredPrevType } }
			});
			if (!prevCompleted) {
				return fail(409, {
					message:
						session.type === 'MAIN_B'
							? 'Valide la séance A avant de valider la séance B.'
							: 'Valide la séance B avant de valider la séance C.'
				});
			}
		}

		const mandatoryVideoIds =
			session.type === 'DISCOVERY'
				? sessionVideos.map((video) => video.id)
				: sessionVideos.filter((video) => video.position !== 'PRE').map((video) => video.id);
		const progressDelegate = getUserVideoProgressDelegate();
		if (mandatoryVideoIds.length > 0) {
			const completedMandatoryCount = progressDelegate
				? await progressDelegate.count({
				where: {
					userId,
					workoutVideoId: { in: mandatoryVideoIds },
					completedAt: { not: null }
				}
			  })
				: 0;

			if (completedMandatoryCount < mandatoryVideoIds.length) {
				return fail(409, {
					message:
						'Tu dois d’abord valider les 3 vidéos obligatoires avant de confirmer la séance.'
				});
			}
		}

		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { programStartDate: true }
		});
		const currentUnlockedDayIndex = currentProgramDayIndex(user?.programStartDate ?? null);
		if (dayIdx > currentUnlockedDayIndex) {
			return fail(409, {
				message: 'Cette séance est planifiée dans le futur. Elle se débloquera le jour venu.'
			});
		}

		let scheduledDate: Date | undefined;
		if (user?.programStartDate) {
			const d = calendarDateForProgramDay(user.programStartDate, dayIdx);
			scheduledDate = startOfUtcDay(d);
		}

		await prisma.userWorkoutDay.upsert({
			where: {
				userId_sessionId_dayIndex: {
					userId,
					sessionId,
					dayIndex: dayIdx
				}
			},
			create: {
				userId,
				sessionId,
				dayIndex: dayIdx,
				scheduledDate: scheduledDate ?? undefined,
				completedAt: now,
				isLocked: true
			},
			update: {
				completedAt: now,
				scheduledDate: scheduledDate ?? undefined,
				isLocked: true
			}
		});

		await createPointEvent({
			userId,
			type: 'WORKOUT_COMPLETE',
			amount: WORKOUT_COMPLETION_POINTS,
			metadata: {
				sessionId,
				sessionName: session.name,
				dayIndex: dayIdx
			}
		});

		return {
			success: true,
			pointsAwarded: WORKOUT_COMPLETION_POINTS
		};
	}
};
