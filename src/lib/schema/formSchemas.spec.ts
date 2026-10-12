import { describe, expect, it } from 'vitest';
import { adminProgramSettingsSchema, adminPointEventSchema, adminUserProfileSchema } from './admin/adminUserEditionSchema';

import { profileSchema } from './profile/profileSchema';
import { wellBeingSchema } from './well-being/wellBeingSchema';

describe('profileSchema', () => {
	it('lit les listes en JSON ou en tableau, les cases à cocher et les nombres du formulaire', () => {
		const parsed = profileSchema.parse({
			objectives: '["perte","énergie"]',
			allergens: '["eggs","inconnu"]',
			breadDaily: 'on',
			breakfastEnabled: 'off',
			alcoholHabit: 'on',
			tobaccoHabit: 'off',
			intermittentFastingMorning: true,
			coffeePerDay: '3',
			bodyFatPercent: '22.5',
			weightLossGoalKg: '',
			breadGramsPerDay: '120',
			breadType: 'MULTIGRAIN',
			familyCoefficients: '[{"label":"enfant","coefficient":0.5}]',
			shoppingListSortOrder: 'alphabetical'
		});
		expect(parsed).toMatchObject({
			objectives: ['perte', 'énergie'],
			breadDaily: true,
			breakfastEnabled: false,
			alcoholHabit: true,
			tobaccoHabit: false,
			intermittentFastingMorning: true,
			coffeePerDay: 3,
			bodyFatPercent: 22.5,
			breadGramsPerDay: 120
		});
		expect(parsed.weightLossGoalKg).toBeUndefined();
		expect(parsed.allergens).toEqual([]);
		expect(parsed.familyCoefficients).toEqual([{ label: 'enfant', coefficient: 0.5 }]);
	});

	it('accepte des valeurs vides ou de types inattendus sans échouer', () => {
		const parsed = profileSchema.parse({ objectives: '', allergens: 5, breadDaily: 'peut-être', alcoholHabit: 'peut-être', familyCoefficients: 'pas du json' });
		expect(parsed).toMatchObject({ objectives: [], allergens: [], breadDaily: false });
		expect(parsed.alcoholHabit).toBeUndefined();
		expect(parsed.familyCoefficients).toBeUndefined();
		expect(profileSchema.parse({ objectives: ['a'], allergens: ['oeufs'], familyCoefficients: { a: 1 } }).allergens).toEqual(['oeufs']);
		expect(profileSchema.parse({ familyCoefficients: '' }).familyCoefficients).toBeUndefined();
	});

	it('refuse un nombre hors bornes', () => {
		expect(profileSchema.safeParse({ coffeePerDay: '25' }).success).toBe(false);
		expect(profileSchema.safeParse({ bodyFatPercent: '1' }).success).toBe(false);
		expect(profileSchema.safeParse({ familyCoefficients: [{ label: 'x', coefficient: 2 }] }).success).toBe(false);
	});
});

describe('wellBeingSchema', () => {
	it('lit les curseurs de 1 à 10, vides acceptés', () => {
		expect(wellBeingSchema.parse({ stressLevel: '7', sleepQuality: '', happinessLevel: null }).stressLevel).toBe(7);
		expect(wellBeingSchema.parse({ sleepQuality: '' }).sleepQuality).toBeUndefined();
		expect(wellBeingSchema.safeParse({ stressLevel: '11' }).success).toBe(false);
	});
});

describe('schémas d’édition admin : conversions', () => {
	it('lisent booléens de formulaire, métadonnées JSON et valeurs vides', () => {
		const profile = adminUserProfileSchema.parse({ id: 'u', alcoholHabit: 'false', tobaccoHabit: '0', intermittentFastingMorning: 'true', breadDaily: '1', allergens: 'eggs, milk', familyCoefficients: '{"a":1}' });
		expect(profile).toMatchObject({ alcoholHabit: false, tobaccoHabit: false, intermittentFastingMorning: true, breadDaily: true });
		expect(profile.familyCoefficients).toEqual({ a: 1 });
		expect(adminUserProfileSchema.parse({ id: 'u', alcoholHabit: 'autre', objectives: '[1,2]', kitchenEquipment: 'four,poêle', familyCoefficients: 'pas du json' })).toMatchObject({ objectives: ['1', '2'], kitchenEquipment: ['four', 'poêle'] });
		expect(adminUserProfileSchema.parse({ id: 'u', objectives: 42 }).objectives).toEqual([]);

		expect(adminPointEventSchema.parse({ type: 'DAILY_TASK', amount: '5', metadata: '{"a":1}' }).metadata).toEqual({ a: 1 });
		expect(adminPointEventSchema.parse({ type: 'DAILY_TASK', metadata: 'pas du json' }).metadata).toBeUndefined();
		expect(adminPointEventSchema.parse({ type: 'DAILY_TASK', metadata: { déjà: 'objet' } }).metadata).toEqual({ déjà: 'objet' });
		expect(adminPointEventSchema.parse({ type: 'DAILY_TASK' }).amount).toBe(0);

		const settings = adminProgramSettingsSchema.parse({ id: 'u', photoValidationStatus: 'PENDING', programStartDate: ' ', photoValidatedAt: '' });
		expect(settings.programStartDate).toBeNull();
		expect(settings.nutritionDaysAllocated).toBe(0);
	});
});


