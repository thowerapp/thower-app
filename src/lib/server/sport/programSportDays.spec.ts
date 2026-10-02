import { describe, it, expect, vi } from 'vitest';

vi.mock('$lib/server', () => ({ prisma: {} }));

import {
	deriveSessionType,
	orderSportVideos,
	placeSportWeek,
	type SlotSession,
	type SportItemRow,
	type WeekUserWorkoutRow
} from './programSportDays';

let seq = 0;
function item(
	position: 'PRE' | 'VID1' | 'VID2',
	opts: {
		id?: string;
		order?: number;
		at?: number;
		uid?: string;
		sessionType?: 'MAIN_A' | 'MAIN_B' | null;
	} = {}
): SportItemRow {
	const id = opts.id ?? `v${++seq}`;
	return {
		dayIndex: 1,
		order: opts.order ?? 0,
		createdAt: new Date(opts.at ?? seq),
		video: {
			id,
			title: id,
			position,
			status: 'ready',
			cloudflareUid: opts.uid ?? `cf_${id}`,
			durationSeconds: 60,
			isOptional: false,
			sessionType: opts.sessionType === undefined ? 'MAIN_A' : opts.sessionType
		}
	};
}

describe('orderSportVideos', () => {
	it('garde toutes les pré-séances (pas de limite à 3) puis Séance 1 puis Séance 2', () => {
		const rows = orderSportVideos([
			item('VID2', { id: 's2', at: 1 }),
			item('PRE', { id: 'p3', at: 5 }),
			item('VID1', { id: 's1', at: 2 }),
			item('PRE', { id: 'p1', at: 3 }),
			item('PRE', { id: 'p2', at: 4 }),
			item('PRE', { id: 'p4', at: 6 })
		]);
		expect(rows.map((r) => r.id)).toEqual(['p1', 'p2', 'p3', 'p4', 's1', 's2']);
		expect(rows.map((r) => r.order)).toEqual([0, 1, 2, 3, 4, 5]);
	});

	it('ordonne les pré-séances par order puis par date de rattachement', () => {
		const rows = orderSportVideos([
			item('PRE', { id: 'late', order: 0, at: 9 }),
			item('PRE', { id: 'first', order: 0, at: 1 }),
			item('PRE', { id: 'explicit', order: 1, at: 0 })
		]);
		expect(rows.map((r) => r.id)).toEqual(['first', 'late', 'explicit']);
	});

	it('exclut les fiches seed et les vidéos supprimées, dédoublonne', () => {
		const rows = orderSportVideos([
			item('PRE', { id: 'seed', uid: 'cf_seed_abc' }),
			{ ...item('VID1'), video: null },
			item('VID1', { id: 'dup' }),
			item('VID1', { id: 'dup' })
		]);
		expect(rows.map((r) => r.id)).toEqual(['dup']);
	});
});

describe('deriveSessionType', () => {
	it('prend le type de la Séance 1 en priorité', () => {
		const rows = orderSportVideos([
			item('PRE', { sessionType: 'MAIN_B' }),
			item('VID1', { sessionType: 'MAIN_A' })
		]);
		expect(deriveSessionType(rows)).toBe('MAIN_A');
	});

	it('retombe sur null sans type renseigné', () => {
		expect(deriveSessionType(orderSportVideos([item('VID1', { sessionType: null })]))).toBeNull();
	});
});

const A: SlotSession = { id: 'sessA', name: 'A', type: 'MAIN_A' };
const B: SlotSession = { id: 'sessB', name: 'B', type: 'MAIN_B' };

function row(
	partial: Partial<WeekUserWorkoutRow> & { id: string; dayIndex: number }
): WeekUserWorkoutRow {
	return {
		sessionId: A.id,
		contentDayIndex: null,
		completedAt: null,
		isLocked: false,
		session: { ...A, active: true },
		...partial
	};
}

describe('placeSportWeek', () => {
	it('un jour rattaché = une séance sur ce jour', () => {
		const slots = placeSportWeek({
			weekStart: 1,
			weekEnd: 7,
			sessionByContentDay: new Map([
				[2, A],
				[5, B]
			]),
			userRows: []
		});
		expect([...slots.keys()].sort()).toEqual([2, 5]);
		expect(slots.get(2)).toMatchObject({ session: A, contentDayIndex: 2, userWorkoutDayId: null });
		expect(slots.get(5)).toMatchObject({ session: B, contentDayIndex: 5 });
	});

	it('semaine sans rattachement : aucune séance', () => {
		expect(
			placeSportWeek({ weekStart: 1, weekEnd: 7, sessionByContentDay: new Map(), userRows: [] })
				.size
		).toBe(0);
	});

	it('une séance déplacée garde les vidéos de son jour source', () => {
		const slots = placeSportWeek({
			weekStart: 1,
			weekEnd: 7,
			sessionByContentDay: new Map([[2, A]]),
			userRows: [row({ id: 'r1', dayIndex: 3, contentDayIndex: 2 })]
		});
		expect(slots.has(2)).toBe(false);
		expect(slots.get(3)).toMatchObject({ contentDayIndex: 2, userWorkoutDayId: 'r1' });
	});

	it('collision : la séance va sur le premier jour libre', () => {
		const slots = placeSportWeek({
			weekStart: 1,
			weekEnd: 7,
			sessionByContentDay: new Map([
				[2, A],
				[3, B]
			]),
			// Séance du J2 déplacée sur J3, puis l'admin a rattaché des vidéos au J3.
			userRows: [row({ id: 'r1', dayIndex: 3, contentDayIndex: 2 })]
		});
		expect(slots.get(3)).toMatchObject({ contentDayIndex: 2 });
		expect(slots.get(4)).toMatchObject({ contentDayIndex: 3, session: B });
	});

	it('garde l’état validé et l’historique validé sans rattachement', () => {
		const done = new Date('2026-01-01');
		const slots = placeSportWeek({
			weekStart: 1,
			weekEnd: 7,
			sessionByContentDay: new Map([[2, A]]),
			userRows: [
				row({ id: 'r1', dayIndex: 2, completedAt: done }),
				row({
					id: 'old',
					dayIndex: 6,
					completedAt: done,
					sessionId: B.id,
					session: { ...B, active: true }
				}),
				row({ id: 'stale', dayIndex: 4 })
			]
		});
		expect(slots.get(2)).toMatchObject({ completedAt: done, userWorkoutDayId: 'r1' });
		expect(slots.get(6)).toMatchObject({ completedAt: done, session: B });
		expect(slots.has(4)).toBe(false);
	});
});
