import type { AdminVideoDayLink } from '$lib/prisma/video/getAllAdminVideos';

export const SESSION_TYPE_LABELS: Record<string, string> = {
	MAIN_A: 'Séance A',
	MAIN_B: 'Séance B',
	MAIN_C: 'Séance C',
	DISCOVERY: 'Découverte'
};

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

/**
 * Libellé de la colonne « Journées » du tableau admin, ex. `J1 · Séance A`.
 * Vidéo sport sans jour précis : `Séance A · chaque semaine` (l'utilisateur place ses séances).
 */
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
		const session = SESSION_TYPE_LABELS[v.sessionType] ?? v.sessionType;
		return parts.length > 0 ? `${parts.join(', ')} · ${session}` : `${session} · chaque semaine`;
	}

	return parts.length > 0 ? parts.join(', ') : '—';
}
