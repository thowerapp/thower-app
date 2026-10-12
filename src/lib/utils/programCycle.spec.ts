import { describe, expect, it } from 'vitest';
import {
	absoluteDayIndex,
	absoluteProgressMonth,
	completedInCycle,
	completedInCycleWhere,
	cycleDayLabel,
	nextCycleStart,
	programCycleStarts,
	resolveProgramCycle
} from './programCycle';

// Lundi 5 janvier 2026, minuit Paris (UTC+1).
const START = new Date('2026-01-04T23:00:00.000Z');
// Lundi 6 avril 2026 = START + 91 jours, minuit Paris (UTC+2, heure d'été).
const CYCLE2 = new Date('2026-04-05T22:00:00.000Z');
const at = (iso: string) => new Date(iso);

describe('programCycleStarts', () => {
	it('part de programStartDate et ignore les départs antérieurs', () => {
		expect(programCycleStarts({ programStartDate: null, programCycleStarts: [CYCLE2] })).toEqual([]);
		expect(
			programCycleStarts({ programStartDate: START, programCycleStarts: [CYCLE2, at('2025-01-01T00:00:00Z')] })
		).toEqual([START, CYCLE2]);
	});
});

describe('resolveProgramCycle', () => {
	const user = { programStartDate: START, programCycleStarts: [CYCLE2] };

	it('sans programme : cycle 0', () => {
		expect(resolveProgramCycle({ programStartDate: null }).cycle).toBe(0);
	});

	it('avant le départ : premier cycle en attente', () => {
		const c = resolveProgramCycle(user, at('2026-01-03T12:00:00Z'));
		expect(c).toMatchObject({ cycle: 1, dayIndex: 0, offset: 0, awaitingStart: true });
	});

	it('pendant le premier cycle', () => {
		const c = resolveProgramCycle(user, at('2026-01-07T12:00:00Z'));
		expect(c).toMatchObject({ cycle: 1, dayIndex: 3, offset: 0, awaitingStart: false });
	});

	it('dernier jour du cycle 1, puis bascule le lundi suivant', () => {
		expect(resolveProgramCycle(user, at('2026-04-05T12:00:00Z'))).toMatchObject({ cycle: 1, dayIndex: 91 });
		const c = resolveProgramCycle(user, at('2026-04-06T08:00:00Z'));
		expect(c).toMatchObject({ cycle: 2, dayIndex: 1, offset: 91, start: CYCLE2 });
		expect(absoluteDayIndex(c, 1)).toBe(92);
	});

	it('sans renouvellement : reste sur J91 du cycle 1', () => {
		const c = resolveProgramCycle({ programStartDate: START }, at('2026-06-01T12:00:00Z'));
		expect(c).toMatchObject({ cycle: 1, dayIndex: 91 });
	});
});

describe('absoluteProgressMonth', () => {
	it('mois 1..3 au cycle 1, 4..6 au cycle 2, J91 reste au mois 3', () => {
		expect(absoluteProgressMonth({ cycle: 1 }, 1)).toBe(1);
		expect(absoluteProgressMonth({ cycle: 1 }, 91)).toBe(3);
		expect(absoluteProgressMonth({ cycle: 2 }, 31)).toBe(5);
	});
});

describe('nextCycleStart', () => {
	it('renouvellement pendant le cycle : départ à la fin du cycle', () => {
		expect(nextCycleStart([START], at('2026-02-10T10:00:00Z')).toISOString()).toBe(CYCLE2.toISOString());
	});

	it('renouvellement après la fin : lundi suivant le paiement', () => {
		// Mercredi 22 avril 2026 → lundi 27 avril 2026, minuit Paris.
		expect(nextCycleStart([START], at('2026-04-22T10:00:00Z')).toISOString()).toBe('2026-04-26T22:00:00.000Z');
	});
});

describe('programCycleStarts : ordre', () => {
	it('trie les départs suivants dans l’ordre chronologique', () => {
		const later = new Date('2026-07-06T22:00:00.000Z');
		expect(programCycleStarts({ programStartDate: START, programCycleStarts: [later, CYCLE2] })).toEqual([START, CYCLE2, later]);
	});
});

describe('cycle en cours : complétions et libellé', () => {
	it('compte une complétion au cycle 1 sans condition, aux suivants seulement depuis leur départ', () => {
		expect(completedInCycle(null, { cycle: 1, start: START })).toBe(false);
		expect(completedInCycle(new Date('2025-01-01'), { cycle: 1, start: START })).toBe(true);
		expect(completedInCycle(new Date('2025-01-01'), { cycle: 2, start: null })).toBe(true);
		expect(completedInCycle(new Date(CYCLE2.getTime() - 1), { cycle: 2, start: CYCLE2 })).toBe(false);
		expect(completedInCycle(CYCLE2, { cycle: 2, start: CYCLE2 })).toBe(true);
	});

	it('exprime le même filtre pour la base', () => {
		expect(completedInCycleWhere({ cycle: 1, start: START })).toEqual({ not: null });
		expect(completedInCycleWhere({ cycle: 2, start: null })).toEqual({ not: null });
		expect(completedInCycleWhere({ cycle: 2, start: CYCLE2 })).toEqual({ gte: CYCLE2 });
	});

	it('affiche le cycle à partir du deuxième', () => {
		expect(cycleDayLabel(1, 5)).toBe('Jour 5');
		expect(cycleDayLabel(0, 5)).toBe('Jour 5');
		expect(cycleDayLabel(2, 5)).toBe('Cycle 2 · Jour 5');
	});
});
