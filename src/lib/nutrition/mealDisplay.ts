import type { MealPosition } from '@prisma/client';

export function positionLabel(position: MealPosition): string {
	switch (position) {
		case 'BREAKFAST':
			return 'P’tit déj ou collation';
		case 'LUNCH':
			return 'Déjeuner';
		case 'DINNER':
			return 'Dîner';
		default:
			return 'Repas';
	}
}

const POSITION_ORDER: Record<MealPosition, number> = { BREAKFAST: 0, LUNCH: 1, DINNER: 2 };

export function positionOrder(position: MealPosition): number {
	return POSITION_ORDER[position] ?? 3;
}

const DEFAULT_TIMES: Record<MealPosition, string> = {
	BREAKFAST: '08h00',
	LUNCH: '12h30',
	DINNER: '19h00'
};

export function defaultTimeLabel(position: MealPosition): string {
	return DEFAULT_TIMES[position] ?? '—';
}

type MealMacroFields = {
	isManual: boolean;
	manualCalories: number | null;
	calcCalories: number | null;
	manualProteinG: number | null;
	calcProteinG: number | null;
	manualCarbsG: number | null;
	calcCarbsG: number | null;
	manualFatG: number | null;
	calcFatG: number | null;
	manualFiberG: number | null;
	calcFiberG: number | null;
};

const round1 = (v: number) => Math.round(v * 10) / 10;

/** Macros affichées d'un repas : saisie manuelle si présente, sinon valeurs calculées ; kcal à l'unité, macros au dixième. */
export function mealMacrosRounded(m: MealMacroFields) {
	const manual = m.isManual === true;
	return {
		calories: Math.round(manual ? (m.manualCalories ?? 0) : (m.calcCalories ?? 0)),
		proteinG: round1(manual ? (m.manualProteinG ?? 0) : (m.calcProteinG ?? 0)),
		carbsG: round1(manual ? (m.manualCarbsG ?? 0) : (m.calcCarbsG ?? 0)),
		fatG: round1(manual ? (m.manualFatG ?? 0) : (m.calcFatG ?? 0)),
		fiberG: round1(manual ? (m.manualFiberG ?? 0) : (m.calcFiberG ?? 0))
	};
}
