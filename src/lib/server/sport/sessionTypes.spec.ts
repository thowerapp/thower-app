import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server', () => ({ prisma: {} }));

import {
	assignWeekSessionTypes,
	explicitSessionType,
	type SessionWorkoutVideoRow
} from './programSportDays';

type Type = SessionWorkoutVideoRow['sessionType'];

function video(
	position: SessionWorkoutVideoRow['position'],
	sessionType: Type
): SessionWorkoutVideoRow {
	return {
		id: `${position}-${sessionType}`,
		title: 't',
		position,
		order: 0,
		status: 'ready',
		cloudflareUid: 'cf',
		durationSeconds: 60,
		isOptional: false,
		sessionType
	};
}

const ALL = new Set<NonNullable<Type>>(['MAIN_A', 'MAIN_B', 'MAIN_C', 'DISCOVERY']);

describe('explicitSessionType', () => {
	it('privil\u00e9gie la vid\u00e9o 1, puis la vid\u00e9o 2, puis les pr\u00e9-s\u00e9ances', () => {
		expect(
			explicitSessionType([
				video('PRE', 'MAIN_C'),
				video('VID1', 'MAIN_B'),
				video('VID2', 'MAIN_A')
			])
		).toBe('MAIN_B');
		expect(explicitSessionType([video('PRE', 'MAIN_C'), video('VID2', 'MAIN_A')])).toBe('MAIN_A');
		expect(explicitSessionType([video('PRE', 'MAIN_C')])).toBe('MAIN_C');
	});

	it('renvoie null sans type', () => {
		expect(explicitSessionType([video('VID1', null)])).toBeNull();
	});
});

describe('assignWeekSessionTypes', () => {
	it('suit le type admin, ind\u00e9pendamment du rang du jour', () => {
		const days = new Map([
			[2, [video('VID1', 'MAIN_B')]],
			[4, [video('VID1', 'MAIN_C')]]
		]);
		const types = assignWeekSessionTypes(days, ALL);
		expect(types.get(2)).toBe('MAIN_B');
		expect(types.get(4)).toBe('MAIN_C');
	});

	it('ne d\u00e9cale pas les s\u00e9ances quand un jour est ajout\u00e9 avant', () => {
		const withoutExtra = assignWeekSessionTypes(
			new Map([
				[3, [video('VID1', 'MAIN_B')]],
				[5, [video('VID1', 'MAIN_C')]]
			]),
			ALL
		);
		const withExtra = assignWeekSessionTypes(
			new Map([
				[1, [video('VID1', 'MAIN_A')]],
				[3, [video('VID1', 'MAIN_B')]],
				[5, [video('VID1', 'MAIN_C')]]
			]),
			ALL
		);
		expect(withoutExtra.get(3)).toBe(withExtra.get(3));
		expect(withoutExtra.get(5)).toBe(withExtra.get(5));
	});

	it('retombe sur le rang A, B, C pour les jours sans type', () => {
		const days = new Map([
			[1, [video('VID1', null)]],
			[3, [video('VID1', null)]],
			[5, [video('VID1', null)]],
			[6, [video('VID1', null)]]
		]);
		const types = assignWeekSessionTypes(days, ALL);
		expect([...types.values()]).toEqual(['MAIN_A', 'MAIN_B', 'MAIN_C', 'MAIN_C']);
	});

	it('compl\u00e8te avec les types encore libres autour des jours typ\u00e9s', () => {
		const days = new Map([
			[1, [video('VID1', null)]],
			[3, [video('VID1', 'MAIN_A')]]
		]);
		const types = assignWeekSessionTypes(days, ALL);
		expect(types.get(3)).toBe('MAIN_A');
		expect(types.get(1)).toBe('MAIN_B');
	});

	it('ignore un type absent du catalogue de s\u00e9ances', () => {
		const days = new Map([[1, [video('VID1', 'DISCOVERY')]]]);
		const types = assignWeekSessionTypes(days, new Set(['MAIN_A', 'MAIN_B', 'MAIN_C']));
		expect(types.get(1)).toBe('MAIN_A');
	});

	it('garde une s\u00e9ance D\u00e9couverte hors de la rotation A/B/C', () => {
		const days = new Map([
			[1, [video('VID1', null)]],
			[2, [video('VID1', 'DISCOVERY')]]
		]);
		const types = assignWeekSessionTypes(days, ALL);
		expect(types.get(2)).toBe('DISCOVERY');
		expect(types.get(1)).toBe('MAIN_A');
	});
});
