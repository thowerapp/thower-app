import { describe, expect, it } from 'vitest';
import { formatVideoDays } from './adminVideoDays';

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

	it('associe jour et séance pour une vidéo sport', () => {
		expect(
			formatVideoDays({
				kind: 'workout',
				days: [{ source: 'day', dayIndex: 1 }],
				sessionType: 'MAIN_A'
			})
		).toBe('J1 · Séance A');
		expect(formatVideoDays({ kind: 'workout', days: [], sessionType: 'MAIN_A' })).toBe(
			'Séance A · chaque semaine'
		);
	});

	it('affiche un tiret pour une vidéo non rattachée', () => {
		expect(formatVideoDays({ kind: 'discovery', days: [] })).toBe('—');
	});
});
