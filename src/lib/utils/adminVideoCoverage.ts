import type { AdminVideoDayLink } from '$lib/prisma/video/getAllAdminVideos';
import { TOTAL_PROGRAM_DAYS } from '$lib/utils/programDay';

export const COVERAGE_SESSION_TYPES = ['MAIN_A', 'MAIN_B', 'MAIN_C', 'DISCOVERY'] as const;
export const COVERAGE_POSITIONS = ['PRE', 'VID1', 'VID2'] as const;

export const SESSION_TYPE_LABELS: Record<string, string> = {
	MAIN_A: 'Séance A',
	MAIN_B: 'Séance B',
	MAIN_C: 'Séance C',
	DISCOVERY: 'Découverte'
};

type CoverageInput = {
	realId: string;
	kind: 'workout' | 'discovery';
	title: string;
	isSeed: boolean;
	days: AdminVideoDayLink[];
	sessionType?: string | null;
	position?: string | null;
};

export type CoverageDay = { dayIndex: number; titles: string[] };
/** `titles[sessionType][position]` = vidéos (hors seed) sur ce créneau de séance */
export type CoverageSessions = Record<string, Record<string, string[]>>;

/** Jours couverts par un rattachement, bornés à J1–J91. */
function daysOf(link: AdminVideoDayLink): number[] {
	if (link.source === 'day') {
		return link.dayIndex >= 1 && link.dayIndex <= TOTAL_PROGRAM_DAYS ? [link.dayIndex] : [];
	}
	const from = Math.max(1, link.from ?? 1);
	const until = Math.min(TOTAL_PROGRAM_DAYS, link.until ?? TOTAL_PROGRAM_DAYS);
	const out: number[] = [];
	for (let d = from; d <= until; d++) out.push(d);
	return out;
}

/** Couverture du programme par les vraies vidéos (seeds exclues). */
export function buildVideoCoverage(videos: CoverageInput[]): {
	days: CoverageDay[];
	sessions: CoverageSessions;
} {
	const days: CoverageDay[] = Array.from({ length: TOTAL_PROGRAM_DAYS }, (_, i) => ({
		dayIndex: i + 1,
		titles: []
	}));
	const sessions: CoverageSessions = Object.fromEntries(
		COVERAGE_SESSION_TYPES.map((t) => [t, Object.fromEntries(COVERAGE_POSITIONS.map((p) => [p, []]))])
	);

	for (const v of videos) {
		if (v.isSeed) continue;
		const covered = new Set(v.days.flatMap(daysOf));
		for (const d of covered) days[d - 1].titles.push(v.title);
		if (v.kind === 'workout' && v.sessionType && v.position) {
			sessions[v.sessionType]?.[v.position]?.push(v.title);
		}
	}

	return { days, sessions };
}

/** `[1, 2, 3, 8]` → `J1–J3, J8` */
function compactDays(days: number[]): string {
	const sorted = [...new Set(days)].sort((a, b) => a - b);
	const parts: string[] = [];
	let i = 0;
	while (i < sorted.length) {
		let j = i;
		while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
		parts.push(j === i ? `J${sorted[i]}` : `J${sorted[i]}–J${sorted[j]}`);
		i = j + 1;
	}
	return parts.join(', ');
}

/** Libellé de la colonne « Journées » du tableau admin. */
export function formatVideoDays(v: {
	kind: 'workout' | 'discovery';
	days: AdminVideoDayLink[];
	sessionType?: string | null;
}): string {
	const parts: string[] = [];

	const exact = v.days.flatMap((l) => (l.source === 'day' ? [l.dayIndex] : []));
	if (exact.length > 0) parts.push(compactDays(exact));

	for (const l of v.days) {
		if (l.source !== 'task') continue;
		if (l.from == null && l.until == null) parts.push('tous les jours');
		else if (l.until == null) parts.push(`dès J${l.from}`);
		else if (l.from == null) parts.push(`jusqu’à J${l.until}`);
		else parts.push(l.from === l.until ? `J${l.from}` : `J${l.from}–J${l.until}`);
	}

	if (v.kind === 'workout' && v.sessionType) {
		parts.push(`${SESSION_TYPE_LABELS[v.sessionType] ?? v.sessionType} · chaque semaine`);
	}

	return parts.length > 0 ? parts.join(' · ') : '— non rattachée';
}
