import type { ActivityLevel } from '@prisma/client';

const MIN_TARGET_KCAL = 1200;

export function activityCoefficient(level: ActivityLevel | null | undefined): number {
	switch (level) {
		case 'ACTIVE':
			return 1.35;
		case 'ATHLETE':
			return 1.5;
		case 'SEDENTARY':
		default:
			return 1.2;
	}
}

/**
 * Coefficient calorique basé sur le % masse grasse (recomposition Thower).
 * ATHLETE (< 15 % MG) : léger surplus — ACTIVE (15–22 %) : entretien — SEDENTARY (> 22 %) : déficit modéré.
 */
export function bodyFatCoefficient(bodyFatPercent: number): number {
	if (bodyFatPercent < 15) return 1.03;
	if (bodyFatPercent <= 22) return 0.97;
	return 0.91;
}

export function leanMassKg(weightKg: number, bodyFatPercent: number): number {
	return weightKg * (1 - bodyFatPercent / 100);
}

/** Moyenne Katch–McArdle et Cunningham (kcal/j). */
export function metabolicBasalKcalCrossed(leanKg: number): number {
	const mb1 = 370 + 21.6 * leanKg;
	const mb2 = 500 + 22.0 * leanKg;
	return (mb1 + mb2) / 2;
}

export function tdeeFromProfile(params: {
	weightKg: number;
	bodyFatPercent: number;
	activityLevel: ActivityLevel | null | undefined;
}): number {
	const mm = leanMassKg(params.weightKg, params.bodyFatPercent);
	const mb = metabolicBasalKcalCrossed(mm);
	const c = activityCoefficient(params.activityLevel);
	return mb * c;
}

/**
 * Calories cibles journalières = MB × activityCoefficient × bodyFatCoefficient.
 * Retourne null si données insuffisantes pour un calcul fiable.
 */
export function targetCaloriesPerDay(params: {
	weightKg: number;
	bodyFatPercent: number | null | undefined;
	activityLevel?: ActivityLevel | null;
}): number | null {
	if (
		params.weightKg <= 0 ||
		params.bodyFatPercent == null ||
		params.bodyFatPercent < 3 ||
		params.bodyFatPercent > 70
	) {
		return null;
	}
	const mm = leanMassKg(params.weightKg, params.bodyFatPercent);
	const mb = metabolicBasalKcalCrossed(mm);
	const ac = activityCoefficient(params.activityLevel);
	return Math.round(Math.max(mb * ac * bodyFatCoefficient(params.bodyFatPercent), MIN_TARGET_KCAL));
}

/** Besoins protéiques (g/j) : masse maigre × 1,8. */
export function dailyProteinTargetG(weightKg: number, bodyFatPercent: number): number {
	const mm = leanMassKg(weightKg, bodyFatPercent);
	return mm * 1.8;
}

/** Fibres minimales (g/j) : 15 g / 1000 kcal. */
export function dailyFiberTargetG(targetKcal: number): number {
	return (15 * targetKcal) / 1000;
}

/** Eau minimale (L/j) — sans muscu 0,028×poids ; avec muscu 0,035×poids. */
export function dailyWaterLitersMin(weightKg: number, workoutDay: boolean): number {
	const coef = workoutDay ? 0.035 : 0.028;
	return weightKg * coef;
}
