import { prisma } from '$lib/server';
import type { WorkoutSessionType, WorkoutVideoPosition } from '@prisma/client';
import { isSeedCloudflareUid } from '$lib/prisma/video/seedVideo';
import { sportWeekBounds, TOTAL_PROGRAM_DAYS, TOTAL_PROGRAM_WEEKS } from '$lib/utils/programDay';
import { cachedSportPlan } from './sportPlanCache';
import { applySportOverrides, type SportOverrideRow } from './sportOverrides';

/*
 * Séances sport = jours du programme sur lesquels l'admin a rattaché des vidéos
 * (ProgramDayItem SPORT_SESSION → WorkoutVideo). Le contenu d'une séance est exactement
 * l'ensemble des vidéos rattachées à son jour source : pré-séances (autant que voulu),
 * puis Séance 1 (VID1), puis Séance 2 (VID2). La position vient de la fiche vidéo.
 */

const POSITION_ORDER: Record<WorkoutVideoPosition, number> = {
	PRE: 0,
	VID1: 1,
	VID2: 2
};

const PLANNER_SESSION_TYPES = ['MAIN_A', 'MAIN_B', 'MAIN_C', 'DISCOVERY'] as const;

export type SessionWorkoutVideoRow = {
	id: string;
	title: string;
	position: WorkoutVideoPosition;
	order: number;
	status: string;
	cloudflareUid: string;
	durationSeconds: number | null;
	isOptional: boolean;
	sessionType: WorkoutSessionType | null;
};

export type SportItemRow = {
	dayIndex: number;
	order: number;
	createdAt: Date;
	video: {
		id: string;
		title: string;
		position: WorkoutVideoPosition;
		status: string;
		cloudflareUid: string;
		durationSeconds: number | null;
		isOptional: boolean;
		sessionType: WorkoutSessionType | null;
	} | null;
};

export type SessionCatalogRow = {
	id: string;
	name: string;
	type: WorkoutSessionType;
	weekNumber: number | null;
	order: number;
};

export type SlotSession = { id: string; name: string; type: WorkoutSessionType };

export type WeekUserWorkoutRow = {
	id: string;
	sessionId: string;
	dayIndex: number;
	contentDayIndex: number | null;
	completedAt: Date | null;
	isLocked: boolean;
	session: (SlotSession & { active: boolean }) | null;
};

export type SportWeekSlot = {
	session: SlotSession;
	/** Jour programme dont les vidéos sont jouées */
	contentDayIndex: number;
	completedAt: Date | null;
	isLocked: boolean;
	/** Ligne UserWorkoutDay existante (déplacement / validation), sinon null */
	userWorkoutDayId: string | null;
};

/**
 * Vidéos d'un jour, dans l'ordre d'affichage : PRE (ordre de rattachement), VID1, VID2.
 * Exclut les fiches seed et les vidéos supprimées, dédoublonne une vidéo rattachée deux fois.
 */
export function orderSportVideos(items: SportItemRow[]): SessionWorkoutVideoRow[] {
	const sorted = [...items]
		.filter((item) => item.video != null && !isSeedCloudflareUid(item.video.cloudflareUid))
		.sort(
			(a, b) =>
				POSITION_ORDER[a.video!.position] - POSITION_ORDER[b.video!.position] ||
				a.order - b.order ||
				a.createdAt.getTime() - b.createdAt.getTime()
		);

	const seen = new Set<string>();
	const rows: SessionWorkoutVideoRow[] = [];
	for (const { video } of sorted) {
		if (!video || seen.has(video.id)) continue;
		seen.add(video.id);
		rows.push({
			id: video.id,
			title: video.title,
			position: video.position,
			order: rows.length,
			status: video.status,
			cloudflareUid: video.cloudflareUid,
			durationSeconds: video.durationSeconds,
			isOptional: video.isOptional,
			sessionType: video.sessionType
		});
	}
	return rows;
}

/**
 * Séances hebdomadaires A, B, C dans l'ordre des jours sport de la semaine.
 * (Les vidéos d'un même jour — explication, échauffement, séance — forment une seule séance.)
 */
const WEEKLY_SESSION_TYPES = ['MAIN_A', 'MAIN_B', 'MAIN_C'] as const;

export function pickSessionForType(
	sessions: SessionCatalogRow[],
	type: WorkoutSessionType,
	selectedWeek: number
): SessionCatalogRow | null {
	const candidates = sessions.filter((session) => session.type === type);
	if (candidates.length === 0) return null;
	// Semaines calées sur le lundi : une 14e semaine partielle peut exister.
	selectedWeek = Math.min(TOTAL_PROGRAM_WEEKS, selectedWeek);

	return (
		candidates.find((session) => session.weekNumber === selectedWeek) ??
		candidates.find((session) => session.weekNumber == null) ??
		candidates[0]
	);
}

function toSlotSession(s: SlotSession): SlotSession {
	return { id: s.id, name: s.name, type: s.type };
}

/**
 * Type de séance choisi par l'admin sur les vidéos d'un jour : Vidéo 1, puis Vidéo 2, puis pré-séances.
 * Null si aucune vidéo du jour n'en porte (fiches héritées).
 */
export function explicitSessionType(videos: SessionWorkoutVideoRow[]): WorkoutSessionType | null {
	for (const position of ['VID1', 'VID2', 'PRE'] as const) {
		const found = videos.find((v) => v.position === position && v.sessionType != null);
		if (found) return found.sessionType;
	}
	return null;
}

/**
 * Type de séance de chaque jour sport d'une semaine.
 * Le type posé par l'admin prime (stable si un jour est ajouté ou retiré) ; sans type exploitable,
 * le jour prend la première séance A/B/C encore libre dans la semaine (C si toutes sont prises).
 */
export function assignWeekSessionTypes(
	days: Map<number, SessionWorkoutVideoRow[]>,
	availableTypes: ReadonlySet<WorkoutSessionType>
): Map<number, WorkoutSessionType> {
	const assigned = new Map<number, WorkoutSessionType>();
	const taken = new Set<WorkoutSessionType>();
	const sortedDays = [...days.keys()].sort((a, b) => a - b);

	for (const day of sortedDays) {
		const type = explicitSessionType(days.get(day)!);
		if (type && availableTypes.has(type)) {
			assigned.set(day, type);
			taken.add(type);
		}
	}
	for (const day of sortedDays) {
		if (assigned.has(day)) continue;
		const type = WEEKLY_SESSION_TYPES.find((t) => !taken.has(t)) ?? WEEKLY_SESSION_TYPES[2];
		assigned.set(day, type);
		taken.add(type);
	}
	return assigned;
}

/**
 * Place les séances d'une semaine (fonction pure).
 * - Chaque jour source `d` (jour rattaché) donne une séance.
 * - Si l'utilisateur a une ligne pour ce jour source (déplacée ou validée), la séance est
 *   affichée à son `dayIndex` avec son état ; sinon au jour `d`, ou au premier jour libre.
 * - Les lignes validées dont le jour n'a plus de rattachement restent visibles (historique).
 */
export function placeSportWeek(params: {
	weekStart: number;
	weekEnd: number;
	sessionByContentDay: Map<number, SlotSession>;
	userRows: WeekUserWorkoutRow[];
}): Map<number, SportWeekSlot> {
	const { weekStart, weekEnd, sessionByContentDay, userRows } = params;
	const slots = new Map<number, SportWeekSlot>();
	const consumedRowIds = new Set<string>();

	const inWeek = (day: number) => day >= weekStart && day <= weekEnd;
	const firstFreeDay = (from: number): number | null => {
		for (let day = from; day <= weekEnd; day++) if (!slots.has(day)) return day;
		for (let day = from - 1; day >= weekStart; day--) if (!slots.has(day)) return day;
		return null;
	};

	const rows = userRows
		.filter((row) => row.session?.active && inWeek(row.dayIndex))
		.sort((a, b) => {
			const aCompleted = a.completedAt != null ? 1 : 0;
			const bCompleted = b.completedAt != null ? 1 : 0;
			if (aCompleted !== bCompleted) return bCompleted - aCompleted;
			return a.dayIndex - b.dayIndex;
		});

	const contentDays = [...sessionByContentDay.keys()].filter(inWeek).sort((a, b) => a - b);

	// 1. Séances que l'utilisateur a déjà placées ou validées : leur jour d'affichage est fixé.
	const unplaced: number[] = [];
	for (const contentDay of contentDays) {
		const row = rows.find(
			(r) => !consumedRowIds.has(r.id) && (r.contentDayIndex ?? r.dayIndex) === contentDay
		);
		if (!row) {
			unplaced.push(contentDay);
			continue;
		}
		consumedRowIds.add(row.id);
		const day = slots.has(row.dayIndex) ? firstFreeDay(row.dayIndex) : row.dayIndex;
		if (day == null) continue;
		slots.set(day, {
			session: toSlotSession(row.session!),
			contentDayIndex: contentDay,
			completedAt: row.completedAt,
			isLocked: row.isLocked,
			userWorkoutDayId: row.id
		});
	}

	// 2. Autres jours rattachés : affichés sur leur propre jour (ou le premier jour libre).
	for (const contentDay of unplaced) {
		const day = slots.has(contentDay) ? firstFreeDay(contentDay) : contentDay;
		if (day == null) continue;
		slots.set(day, {
			session: sessionByContentDay.get(contentDay)!,
			contentDayIndex: contentDay,
			completedAt: null,
			isLocked: false,
			userWorkoutDayId: null
		});
	}

	// 3. Historique : séances validées sur un jour qui n'a plus de rattachement.
	for (const row of rows) {
		if (consumedRowIds.has(row.id) || row.completedAt == null || slots.has(row.dayIndex)) continue;
		consumedRowIds.add(row.id);
		slots.set(row.dayIndex, {
			session: toSlotSession(row.session!),
			contentDayIndex: row.contentDayIndex ?? row.dayIndex,
			completedAt: row.completedAt,
			isLocked: row.isLocked,
			userWorkoutDayId: row.id
		});
	}

	return slots;
}

async function fetchSportItems(
	dayIndex: number | { gte: number; lte: number }
): Promise<SportItemRow[]> {
	const items = await prisma.programDayItem.findMany({
		where: {
			type: 'SPORT_SESSION',
			workoutVideoId: { not: null },
			programDay: { dayIndex, program: { active: true } }
		},
		select: {
			order: true,
			createdAt: true,
			programDay: { select: { dayIndex: true } },
			workoutVideo: {
				select: {
					id: true,
					title: true,
					position: true,
					status: true,
					cloudflareUid: true,
					durationSeconds: true,
					isOptional: true,
					sessionType: true
				}
			}
		}
	});

	return items.map((item) => ({
		dayIndex: item.programDay.dayIndex,
		order: item.order,
		createdAt: item.createdAt,
		video: item.workoutVideo
	}));
}

/** Plan sport global : identique pour tous les users, donc chargé une fois et mis en cache. */
type SportPlan = {
	/** Jours triés ; les jours sans vidéo exploitable sont absents. */
	videosByDay: Map<number, SessionWorkoutVideoRow[]>;
	sessionCatalog: SessionCatalogRow[];
	/** Toutes les vidéos sport (même non rattachées) : source des ajouts personnalisés. */
	videosById: Map<string, SessionWorkoutVideoRow>;
};

async function loadSportPlan(): Promise<SportPlan> {
	const [items, sessionCatalog, allVideos] = await Promise.all([
		fetchSportItems({ gte: 1, lte: TOTAL_PROGRAM_DAYS }),
		prisma.workoutSession.findMany({
			where: { active: true, type: { in: [...PLANNER_SESSION_TYPES] } },
			select: { id: true, name: true, type: true, weekNumber: true, order: true },
			orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
		}),
		prisma.workoutVideo.findMany({
			select: {
				id: true,
				title: true,
				position: true,
				status: true,
				cloudflareUid: true,
				durationSeconds: true,
				isOptional: true,
				sessionType: true
			}
		})
	]);

	const itemsByDay = new Map<number, SportItemRow[]>();
	for (const item of items) {
		const list = itemsByDay.get(item.dayIndex) ?? [];
		list.push(item);
		itemsByDay.set(item.dayIndex, list);
	}

	const videosByDay = new Map<number, SessionWorkoutVideoRow[]>();
	for (const [day, dayItems] of [...itemsByDay.entries()].sort((a, b) => a[0] - b[0])) {
		const videos = orderSportVideos(dayItems);
		if (videos.length > 0) videosByDay.set(day, videos);
	}

	const videosById = new Map<string, SessionWorkoutVideoRow>();
	for (const video of allVideos) {
		if (isSeedCloudflareUid(video.cloudflareUid)) continue;
		videosById.set(video.id, { ...video, order: 0 });
	}
	return { videosByDay, sessionCatalog, videosById };
}

function getSportPlan(): Promise<SportPlan> {
	return cachedSportPlan(loadSportPlan);
}

function daysInRange(plan: SportPlan, from: number, to: number) {
	const days = new Map<number, SessionWorkoutVideoRow[]>();
	for (const [day, videos] of plan.videosByDay) {
		if (day >= from && day <= to) days.set(day, videos);
	}
	return days;
}

/** Personnalisations du plan posées par un admin pour cet utilisateur, dans l'ordre de création. */
async function getUserSportOverrides(userId: string): Promise<SportOverrideRow[]> {
	return prisma.userSportOverride.findMany({
		where: { userId },
		select: { dayIndex: true, kind: true, workoutVideoIds: true },
		orderBy: { createdAt: 'asc' }
	});
}

/**
 * Vidéos d'une séance pour un jour source du programme (1..91).
 * Avec `userId`, les personnalisations de cet utilisateur sont appliquées.
 */
export async function getSportVideosForProgramDay(
	dayIndex: number,
	userId?: string
): Promise<SessionWorkoutVideoRow[]> {
	const plan = await getSportPlan();
	const base = plan.videosByDay.get(dayIndex) ?? [];
	if (!userId) return [...base];

	const overrides = (await getUserSportOverrides(userId)).filter((o) => o.dayIndex === dayIndex);
	const days = applySportOverrides(new Map([[dayIndex, base]]), overrides, plan.videosById);
	return [...(days.get(dayIndex) ?? [])];
}

/** Jours sport d'une plage → vidéos ordonnées. Les jours sans vidéo exploitable sont absents. */
export async function getSportDaysInRange(
	from: number,
	to: number
): Promise<Map<number, SessionWorkoutVideoRow[]>> {
	return daysInRange(await getSportPlan(), from, to);
}

/** Séances d'une semaine sport pour un utilisateur (planning, déplacement, page séance). */
export async function resolveSportWeek(params: {
	userId: string;
	programStart: Date | null;
	week: number;
}) {
	const { userId, programStart, week } = params;
	const { mondayDayIndex, weekStart, weekEnd } = sportWeekBounds(programStart, week);

	const [plan, userRows, userOverrides] = await Promise.all([
		getSportPlan(),
		prisma.userWorkoutDay.findMany({
			where: { userId, dayIndex: { gte: weekStart, lte: weekEnd } },
			select: {
				id: true,
				sessionId: true,
				dayIndex: true,
				contentDayIndex: true,
				completedAt: true,
				isLocked: true,
				session: { select: { id: true, name: true, type: true, active: true } }
			}
		}),
		getUserSportOverrides(userId)
	]);

	const { sessionCatalog } = plan;
	const sportDays = applySportOverrides(
		daysInRange(plan, weekStart, weekEnd),
		userOverrides.filter((o) => o.dayIndex >= weekStart && o.dayIndex <= weekEnd),
		plan.videosById
	);
	const sessionByContentDay = new Map<number, SlotSession>();
	const typeByDay = assignWeekSessionTypes(sportDays, new Set(sessionCatalog.map((s) => s.type)));
	for (const [day, type] of typeByDay) {
		const session =
			pickSessionForType(sessionCatalog, type, week) ??
			pickSessionForType(sessionCatalog, 'MAIN_A', week) ??
			sessionCatalog[0] ??
			null;
		if (session) sessionByContentDay.set(day, toSlotSession(session));
	}

	const slots = placeSportWeek({
		weekStart,
		weekEnd,
		sessionByContentDay,
		userRows: userRows as WeekUserWorkoutRow[]
	});

	return { mondayDayIndex, weekStart, weekEnd, slots, userRows: userRows as WeekUserWorkoutRow[] };
}
