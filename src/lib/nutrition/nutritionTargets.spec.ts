import { describe, expect, it } from 'vitest';
import { activityCoefficient, targetCaloriesPerDay, tdeeFromProfile } from './nutritionTargets';

describe('activityCoefficient', () => {
	it('applique les paliers recalibrés', () => {
		expect(activityCoefficient('SEDENTARY')).toBe(1.35);
		expect(activityCoefficient('ACTIVE')).toBe(1.5);
		expect(activityCoefficient('ATHLETE')).toBe(1.65);
		expect(activityCoefficient(null)).toBe(1.35);
	});
});

describe('targetCaloriesPerDay', () => {
	// Profil client Athlète : ~81,9 kg de masse sèche, < 14 % MG → déficit 10 %.
	const profile = { weightKg: 93.7, bodyFatPercent: 12.6, activityLevel: 'ATHLETE' as const };

	it('rapproche la DEJ de la fiche MT (3451 kcal)', () => {
		expect(tdeeFromProfile(profile)).toBeGreaterThan(3451 * 0.97);
		expect(tdeeFromProfile(profile)).toBeLessThan(3451 * 1.03);
	});

	it('donne une cible proche de la fiche MT (3106 kcal)', () => {
		expect(targetCaloriesPerDay(profile)).toBe(3176);
	});
});
