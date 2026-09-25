import { describe, expect, it } from 'vitest';
import {
	calendarDateForProgramDay,
	civilDateInTimeZone,
	currentProgramDayIndex,
	isProgramAwaitingStart,
	nextMondayStartParis,
	programDayDateISO,
	programDayUtcDate,
	remainingUntil,
	sportWeekBounds,
	sportWeekCount,
	sportWeekNumberForDay,
	todayStartParis,
	shortWeekdayFrUtc,
	startOfUtcDay
} from './programDay';

describe('startOfUtcDay', () => {
	it('accepte un appel sans argument', () => {
		const d = startOfUtcDay();
		expect(Number.isNaN(d.getTime())).toBe(false);
		expect(d.getUTCHours()).toBe(0);
		expect(d.getUTCMinutes()).toBe(0);
	});
});

describe('nextMondayStartParis', () => {
	it('garde le lundi en cours (été CEST)', () => {
		const mondayMorning = new Date('2026-09-07T00:30:00+02:00');
		const start = nextMondayStartParis(mondayMorning);
		expect(start.toISOString()).toBe('2026-09-06T22:00:00.000Z');
		expect(civilDateInTimeZone(start)).toMatchObject({
			year: 2026,
			month: 9,
			day: 7,
			weekday: 1
		});
	});

	it('avance au lundi suivant depuis un mercredi', () => {
		const wednesday = new Date('2026-09-09T15:00:00+02:00');
		const start = nextMondayStartParis(wednesday);
		expect(civilDateInTimeZone(start)).toMatchObject({
			year: 2026,
			month: 9,
			day: 14,
			weekday: 1
		});
		expect(start.toISOString()).toBe('2026-09-13T22:00:00.000Z');
	});

	it('depuis un dimanche soir Paris, vise le lundi suivant', () => {
		const sundayEveningParis = new Date('2026-09-06T23:30:00+02:00');
		const start = nextMondayStartParis(sundayEveningParis);
		expect(civilDateInTimeZone(start)).toMatchObject({
			year: 2026,
			month: 9,
			day: 7,
			weekday: 1
		});
	});

	it('un dimanche 23:30 UTC est déjà lundi à Paris → J1 = ce lundi', () => {
		const sundayUtcAlreadyMondayParis = new Date('2026-09-06T23:30:00.000Z');
		expect(civilDateInTimeZone(sundayUtcAlreadyMondayParis).weekday).toBe(1);
		const start = nextMondayStartParis(sundayUtcAlreadyMondayParis);
		expect(civilDateInTimeZone(start)).toMatchObject({
			year: 2026,
			month: 9,
			day: 7,
			weekday: 1
		});
	});

	it('minuit d’hiver (CET) pour un lundi de janvier', () => {
		const mondayWinter = new Date('2026-01-05T08:00:00+01:00');
		const start = nextMondayStartParis(mondayWinter);
		expect(start.toISOString()).toBe('2026-01-04T23:00:00.000Z');
		expect(civilDateInTimeZone(start).weekday).toBe(1);
	});
});

describe('currentProgramDayIndex', () => {
	const startMonday = new Date('2026-09-06T22:00:00.000Z');

	it('retourne 0 sans date de départ', () => {
		expect(currentProgramDayIndex(null, new Date('2026-09-09T12:00:00+02:00'))).toBe(0);
	});

	it('retourne 0 tant que le lundi de départ n’est pas atteint', () => {
		const sunday = new Date('2026-09-06T23:30:00+02:00');
		expect(currentProgramDayIndex(startMonday, sunday)).toBe(0);
	});

	it('retourne 1 le lundi de départ', () => {
		const monday = new Date('2026-09-07T00:30:00+02:00');
		expect(currentProgramDayIndex(startMonday, monday)).toBe(1);
	});

	it('retourne 3 un mercredi de la première semaine', () => {
		const wednesday = new Date('2026-09-09T15:00:00+02:00');
		expect(currentProgramDayIndex(startMonday, wednesday)).toBe(3);
	});

	it('plafonne à 91', () => {
		const far = new Date('2027-01-01T12:00:00+01:00');
		expect(currentProgramDayIndex(startMonday, far)).toBe(91);
	});
});

describe('isProgramAwaitingStart', () => {
	const startMonday = new Date('2026-09-06T22:00:00.000Z');

	it('est faux sans date de départ', () => {
		expect(isProgramAwaitingStart(null, new Date('2026-09-09T12:00:00+02:00'))).toBe(false);
	});

	it('est vrai avant le lundi de départ', () => {
		expect(isProgramAwaitingStart(startMonday, new Date('2026-09-06T23:30:00+02:00'))).toBe(true);
	});

	it('est faux le lundi de départ', () => {
		expect(isProgramAwaitingStart(startMonday, new Date('2026-09-07T00:30:00+02:00'))).toBe(false);
	});
});

describe('remainingUntil', () => {
	it('découpe le délai restant', () => {
		const now = new Date('2026-09-09T12:00:00.000Z');
		const target = new Date('2026-09-10T14:05:07.000Z');
		expect(remainingUntil(target, now)).toEqual({
			days: 1,
			hours: 2,
			minutes: 5,
			seconds: 7,
			totalMs: ((26 * 3600) + (5 * 60) + 7) * 1000
		});
	});

	it('renvoie zéro une fois la cible atteinte', () => {
		const t = new Date('2026-09-14T22:00:00.000Z');
		expect(remainingUntil(t, t)).toEqual({
			days: 0,
			hours: 0,
			minutes: 0,
			seconds: 0,
			totalMs: 0
		});
	});
});

describe('calendarDateForProgramDay', () => {
	it('aligne J1 sur un lundi Paris et J2 sur mardi', () => {
		const start = nextMondayStartParis(new Date('2026-09-09T15:00:00+02:00'));
		const j1 = calendarDateForProgramDay(start, 1);
		const j2 = calendarDateForProgramDay(start, 2);
		expect(shortWeekdayFrUtc(j1)).toBe('Lun');
		expect(shortWeekdayFrUtc(j2)).toBe('Mar');
		expect(civilDateInTimeZone(j1)).toMatchObject({ year: 2026, month: 9, day: 14 });
		expect(civilDateInTimeZone(j2)).toMatchObject({ year: 2026, month: 9, day: 15 });
	});
});

describe('dates et semaines sport (lundi → dimanche)', () => {
	// Programme démarré le jeudi 24 septembre 2026 (Paris).
	const start = todayStartParis(new Date('2026-09-24T10:00:00Z'));

	it('date civile Paris sans décalage UTC', () => {
		expect(programDayDateISO(start, 1)).toBe('2026-09-24');
		expect(programDayDateISO(start, 2)).toBe('2026-09-25');
		expect(programDayDateISO(start, -2)).toBe('2026-09-21');
		expect(programDayUtcDate(start, 2).toISOString()).toBe('2026-09-25T00:00:00.000Z');
		expect(shortWeekdayFrUtc(calendarDateForProgramDay(start, 2))).toBe('Ven');
	});

	it('semaine 1 = semaine civile de J1, partielle', () => {
		expect(sportWeekBounds(start, 1)).toEqual({ mondayDayIndex: -2, weekStart: 1, weekEnd: 4 });
		expect(programDayDateISO(start, -2)).toBe('2026-09-21');
		expect(sportWeekBounds(start, 2)).toEqual({ mondayDayIndex: 5, weekStart: 5, weekEnd: 11 });
		expect(programDayDateISO(start, 5)).toBe('2026-09-28');
		expect(sportWeekNumberForDay(start, 2)).toBe(1);
		expect(sportWeekNumberForDay(start, 5)).toBe(2);
		expect(sportWeekCount(start)).toBe(14);
		expect(sportWeekBounds(start, 14)).toEqual({ mondayDayIndex: 89, weekStart: 89, weekEnd: 91 });
	});

	it('démarrage un lundi : 13 semaines pleines', () => {
		const monday = todayStartParis(new Date('2026-09-21T10:00:00Z'));
		expect(sportWeekCount(monday)).toBe(13);
		expect(sportWeekBounds(monday, 1)).toEqual({ mondayDayIndex: 1, weekStart: 1, weekEnd: 7 });
		expect(sportWeekNumberForDay(monday, 8)).toBe(2);
	});
});
