import { z } from 'zod';
import { normalizeStringList } from './normalizeStringList';
import { allergenEnum } from '$lib/schema/recipe/allergens';
import { breadGramsPerDayField, breadTypeField } from '$lib/schema/profile/breadType';

const optionalNumber = (min: number, max: number) =>
	z.preprocess(
		(val) => (val === '' || val === undefined) ? undefined : Number(val),
		z.number().min(min).max(max).optional()
	);

export const activityLevelEnum = z.enum(['SEDENTARY', 'ACTIVE', 'ATHLETE']);

export const objectiveValues = [
	'fat_loss',
	'muscle_gain',
	'more_energy',
	'more_libido',
	'better_sleep',
	'better_body',
	'better_mind'
] as const;

const optionalInt1to10 = z.preprocess(
	(val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
	z.number().int().min(1).max(10).optional()
);

const parseStringArray = (val: unknown): string[] => normalizeStringList(val);

const progressPhotoUrl = z
	.string()
	.startsWith('/api/cloudflare/r2/image/photos/', 'Photo obligatoire invalide');

/** Champs communs profil (objectifs, habitudes) — utilisables dans le formulaire combiné onboarding */
const profileFieldsSchema = z.object({
	activityLevel: activityLevelEnum.optional(),
	objectives: z
		.preprocess(parseStringArray, z.array(z.string()))
		.default([]),
	painsPathologies: z.string().max(2000).optional(),
	contextParticular: z.string().max(2000).optional(),
	breadDaily: z
		.preprocess(
			(val) => (val === true || val === 'on' ? true : val === false || val === 'off' ? false : false),
			z.boolean()
		)
		.default(false),
	breadGramsPerDay: breadGramsPerDayField,
	breadType: breadTypeField,
	breadManagement: z.string().max(2000).optional(),
	sportActivity: z.string().max(2000).optional(),
	allergens: z
		.preprocess(parseStringArray, z.array(allergenEnum).catch([]))
		.default([]),
	coffeePerDay: z.preprocess(
		(val) => (val === '' || val === undefined ? undefined : Number(val)),
		z.number().int().min(0).max(20).optional()
	),
	alcoholHabit: z
		.preprocess(
			(val) => (val === true || val === 'on' ? true : val === false || val === 'off' ? false : undefined),
			z.boolean().optional()
		),
	tobaccoHabit: z
		.preprocess(
			(val) => (val === true || val === 'on' ? true : val === false || val === 'off' ? false : undefined),
			z.boolean().optional()
		),
	breakfastEnabled: z
		.preprocess(
			(val) => (val === true || val === 'on' ? true : val === false || val === 'off' ? false : false),
			z.boolean()
		)
		.default(false),
	intermittentFastingMorning: z
		.preprocess(
			(val) => (val === true || val === 'on' ? true : val === false || val === 'off' ? false : undefined),
			z.boolean().optional()
		),
	familyCoefficients: z
		.preprocess((val) => {
			if (val == null || val === '') return undefined;
			if (typeof val === 'string') {
				try {
					return JSON.parse(val) as unknown;
				} catch {
					return undefined;
				}
			}
			return val;
		}, z.unknown().optional()),
	shoppingListSortOrder: z.enum(['category', 'alphabetical']).optional(),

	bodyFatPercent: z.preprocess(
		(val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
		z.number().min(3).max(70)
	),
	weightLossGoalKg: z.preprocess(
		(val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
		z.number().min(0.5).max(150).optional()
	),

	// Bien-être (échelle 1-10)
	stressLevel: optionalInt1to10,
	sleepQuality: optionalInt1to10,
	bodyConfidence: optionalInt1to10,
	digestionQuality: optionalInt1to10,
	happinessLevel: optionalInt1to10,
	readinessToChange: optionalInt1to10,

	// Alimentation & équipement
	kitchenEquipment: z.preprocess(parseStringArray, z.array(z.string())).default([]),
	disgustingFoods: z.string().max(2000).optional(),
	otherAllergens: z.string().max(2000).optional(),

	// Objectifs détaillés
	physicalObjective: z.string().max(2000).optional(),
	eventMotivation: z.string().max(2000).optional(),

	// Addictions
	addictionsText: z.string().max(2000).optional()
});

/** Mesure corps (une prise : âge, taille, poids, tours) + champs profil pour formulaire combiné */
export const measurementSchema = z
	.object({
		age: optionalNumber(10, 120),
		heightCm: optionalNumber(100, 250),
		weightKg: optionalNumber(30, 300),
		waistCm: optionalNumber(50, 200),
		chestCm: optionalNumber(50, 200),
		armCm: optionalNumber(15, 80),
		frontUrl: progressPhotoUrl,
		sideUrl: progressPhotoUrl,
		backUrl: progressPhotoUrl
	})
	.merge(profileFieldsSchema);

export type MeasurementSchema = z.infer<typeof measurementSchema>;
