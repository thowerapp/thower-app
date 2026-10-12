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
		).toBe('J1 · Séance 1');
		expect(formatVideoDays({ kind: 'workout', days: [], sessionType: 'MAIN_A' })).toBe(
			'Séance 1 · chaque semaine'
		);
	});

	it('affiche un tiret pour une vidéo non rattachée', () => {
		expect(formatVideoDays({ kind: 'discovery', days: [] })).toBe('—');
	});
});

describe('formatVideoDays : plages ouvertes et séances', () => {
	const task = (from: number | null, until: number | null) => ({ source: 'task' as const, from, until });

	it('décrit les bornes ouvertes d’une tâche vidéo', () => {
		expect(formatVideoDays({ kind: 'discovery', days: [task(null, null)] })).toBe('tous les jours');
		expect(formatVideoDays({ kind: 'discovery', days: [task(5, null)] })).toBe('dès J5');
		expect(formatVideoDays({ kind: 'discovery', days: [task(null, 7)] })).toBe('jusqu’à J7');
		expect(formatVideoDays({ kind: 'discovery', days: [task(2, 9)] })).toBe('J2–J9');
		expect(formatVideoDays({ kind: 'discovery', days: [] })).toBe('—');
	});

	it('ajoute la séance d’une vidéo de sport, ou « chaque semaine » sans jour précis', () => {
		expect(formatVideoDays({ kind: 'workout', sessionType: 'MAIN_A', days: [{ source: 'day', dayIndex: 1 }] })).toBe('J1 · Séance 1');
		expect(formatVideoDays({ kind: 'workout', sessionType: 'MAIN_C', days: [] })).toBe('Séance 3 · chaque semaine');
		expect(formatVideoDays({ kind: 'workout', sessionType: 'AUTRE', days: [] })).toBe('AUTRE · chaque semaine');
	});
});
