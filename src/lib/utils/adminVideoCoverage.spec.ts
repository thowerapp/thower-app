import { describe, expect, it } from 'vitest';
import { buildVideoCoverage, formatVideoDays } from './adminVideoCoverage';

describe('formatVideoDays', () => {
	it('compacte les jours précis consécutifs', () => {
		const days = [8, 1, 2, 3].map((dayIndex) => ({ source: 'day' as const, dayIndex }));
		expect(formatVideoDays({ kind: 'discovery', days })).toBe('J1–J3, J8');
	});

	it('affiche les plages de tâche vidéo', () => {
		expect(
			formatVideoDays({ kind: 'discovery', days: [{ source: 'task', from: 1, until: 1 }] })
		).toBe('J1');
		expect(
			formatVideoDays({ kind: 'discovery', days: [{ source: 'task', from: 30, until: null }] })
		).toBe('dès J30');
	});

	it('indique la séance hebdo pour une vidéo sport', () => {
		expect(formatVideoDays({ kind: 'workout', days: [], sessionType: 'MAIN_A' })).toBe(
			'Séance A · chaque semaine'
		);
	});

	it('signale une vidéo non rattachée', () => {
		expect(formatVideoDays({ kind: 'discovery', days: [] })).toBe('— non rattachée');
	});
});

describe('buildVideoCoverage', () => {
	it('ignore les seeds et borne les plages à J1–J91', () => {
		const { days, sessions } = buildVideoCoverage([
			{
				realId: 'a',
				kind: 'discovery',
				title: 'Vraie',
				isSeed: false,
				days: [{ source: 'task', from: 90, until: null }]
			},
			{
				realId: 'b',
				kind: 'workout',
				title: 'Seed',
				isSeed: true,
				days: [{ source: 'day', dayIndex: 5 }],
				sessionType: 'MAIN_A',
				position: 'VID1'
			}
		]);
		expect(days).toHaveLength(91);
		expect(days.filter((d) => d.titles.length > 0).map((d) => d.dayIndex)).toEqual([90, 91]);
		expect(sessions.MAIN_A.VID1).toEqual([]);
	});
});
