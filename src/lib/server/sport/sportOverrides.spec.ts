import { describe, expect, it } from 'vitest';
import { applySportOverrides } from './sportOverrides';
import type { SessionWorkoutVideoRow } from './programSportDays';

function video(id: string, position: SessionWorkoutVideoRow['position']): SessionWorkoutVideoRow {
	return {
		id,
		title: id,
		position,
		order: 0,
		status: 'ready',
		cloudflareUid: `cf_${id}`,
		durationSeconds: 60,
		isOptional: false,
		sessionType: 'MAIN_A'
	};
}

const catalog = new Map(
	[
		video('pre', 'PRE'),
		video('s1', 'VID1'),
		video('s2', 'VID2'),
		video('x1', 'VID1'),
		video('mob', 'PRE')
	].map((v) => [v.id, v])
);
const plan = () => new Map([[3, [catalog.get('s1')!, catalog.get('s2')!]]]);
const ids = (days: Map<number, SessionWorkoutVideoRow[]>, day: number) =>
	days.get(day)?.map((v) => v.id);

describe('applySportOverrides', () => {
	it('renvoie le plan tel quel sans override', () => {
		const base = plan();
		expect(applySportOverrides(base, [], catalog)).toBe(base);
	});

	it('HIDE retire le jour pour cet utilisateur', () => {
		const out = applySportOverrides(
			plan(),
			[{ dayIndex: 3, kind: 'HIDE', workoutVideoIds: [] }],
			catalog
		);
		expect(out.has(3)).toBe(false);
	});

	it('REPLACE remplace les vid\u00e9os du jour', () => {
		const out = applySportOverrides(
			plan(),
			[{ dayIndex: 3, kind: 'REPLACE', workoutVideoIds: ['x1', 's2'] }],
			catalog
		);
		expect(ids(out, 3)).toEqual(['x1', 's2']);
	});

	it('ADD ajoute \u00e0 la bonne position et d\u00e9doublonne', () => {
		const out = applySportOverrides(
			plan(),
			[{ dayIndex: 3, kind: 'ADD', workoutVideoIds: ['mob', 's1'] }],
			catalog
		);
		expect(ids(out, 3)).toEqual(['mob', 's1', 's2']);
		expect(out.get(3)!.map((v) => v.order)).toEqual([0, 1, 2]);
	});

	it('ADD cr\u00e9e la s\u00e9ance sur un jour sans plan', () => {
		const out = applySportOverrides(
			plan(),
			[{ dayIndex: 5, kind: 'ADD', workoutVideoIds: ['s1'] }],
			catalog
		);
		expect(ids(out, 5)).toEqual(['s1']);
		expect([...out.keys()]).toEqual([3, 5]);
	});

	it('ignore les vid\u00e9os inconnues et retire le jour s\u2019il ne reste rien', () => {
		const out = applySportOverrides(
			plan(),
			[{ dayIndex: 3, kind: 'REPLACE', workoutVideoIds: ['inconnue'] }],
			catalog
		);
		expect(out.has(3)).toBe(false);
	});

	it('applique les overrides dans l\u2019ordre et ne modifie pas le plan partag\u00e9', () => {
		const base = plan();
		const out = applySportOverrides(
			base,
			[
				{ dayIndex: 3, kind: 'HIDE', workoutVideoIds: [] },
				{ dayIndex: 3, kind: 'ADD', workoutVideoIds: ['x1'] }
			],
			catalog
		);
		expect(ids(out, 3)).toEqual(['x1']);
		expect(ids(base, 3)).toEqual(['s1', 's2']);
	});
});
