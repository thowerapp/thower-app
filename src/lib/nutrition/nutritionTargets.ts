import type { ActivityLevel } from '@prisma/client';

const MIN_TARGET_KCAL = 1200;

/**
 * Coefficient NAP (Niveau d'Activité Physique), Méthode Thower : DEJ = MB × NAP.
 *
 * Trois paliers choisis par l'utilisateur (ActivityLevel), socle musculation inclus.
 * Décision produit (2026-10-06) : recalibrage 1,35 / 1,5 / 1,65 (anciennement 1,3 / 1,55 / 1,8,
 * qui surestimait la dépense des profils Athlète d'environ 10 % par rapport aux fiches MT).
 */
export function activityCoefficient(level: ActivityLevel | null | undefined): number {
	switch (level) {
		case 'ACTIVE':
			return 1.5;
		case 'ATHLETE':
			return 1.65;
		case 'SEDENTARY':
		default:
			return 1.35;
	}
}

/**
 * Palier de déficit calorique Méthode Thower, indexé sur le % de masse grasse.
 * Décision produit (2026-09-11, confirmée 2026-10-06) : une seule table, appliquée
 * à tous les profils (pas de distinction Homme / Femme).
 */
export function calorieDeficitPercent(bodyFatPercent: number): number {
	if (bodyFatPercent < 14) return 0.1;
	if (bodyFatPercent <= 18) return 0.15;
	if (bodyFatPercent <= 24) return 0.2;
	if (bodyFatPercent <= 31) return 0.23;
	if (bodyFatPercent <= 39) return 0.26;
	return 0.3;
}

export function leanMassKg(weightKg: number, bodyFatPercent: number): number {
	return weightKg * (1 - bodyFatPercent / 100);
}

/** Métabolisme de base — Katch-McArdle, sur la masse sèche uniquement. */
export function metabolicBasalKcal(leanKg: number): number {
	return 370 + 21.6 * leanKg;
}

/** DEJ (maintenance) = MB × NAP. */
export function tdeeFromProfile(params: {
	weightKg: number;
	bodyFatPercent: number;
	activityLevel: ActivityLevel | null | undefined;
}): number {
	const mm = leanMassKg(params.weightKg, params.bodyFatPercent);
	const mb = metabolicBasalKcal(mm);
	const c = activityCoefficient(params.activityLevel);
	return mb * c;
}

/**
 * Cible calorique journalière = DEJ × (1 − déficit), avec garde-fous Méthode Thower :
 *  - jamais sous le métabolisme de base (MB) ;
 *  - déficit journalier jamais supérieur à 1000 kcal ;
 *  - plancher absolu 1200 kcal (sécurité supplémentaire, hors spec).
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
	const mb = metabolicBasalKcal(mm);
	const dej = mb * activityCoefficient(params.activityLevel);
	const deficit = calorieDeficitPercent(params.bodyFatPercent);

	let cible = dej * (1 - deficit);
	cible = Math.max(cible, mb);
	if (dej - cible > 1000) cible = dej - 1000;
	cible = Math.max(cible, MIN_TARGET_KCAL);

	return Math.round(cible);
}

/** Besoins protéiques (g/j) — Méthode Thower : masse maigre × 2.0. */
export function dailyProteinTargetG(weightKg: number, bodyFatPercent: number): number {
	const mm = leanMassKg(weightKg, bodyFatPercent);
	return mm * 2.0;
}

/** Lipides (g/j) — Méthode Thower : poids total × 0.8. */
export function dailyFatTargetG(weightKg: number): number {
	return weightKg * 0.8;
}

/** Glucides (g/j) — Méthode Thower : solde calorique restant après protéines + lipides. */
export function dailyCarbTargetG(targetKcal: number, proteinG: number, fatG: number): number {
	const remainingKcal = targetKcal - (proteinG * 4 + fatG * 9);
	return Math.max(0, remainingKcal / 4);
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
