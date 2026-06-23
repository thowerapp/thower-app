import { z } from 'zod';
import { activityLevelEnum } from '$lib/schema/measurement/measurementSchema';
import { allergenEnum } from '$lib/schema/recipe/allergens';
import { breadGramsPerDayField, breadTypeField } from '$lib/schema/profile/breadType';

const optionalString = z.preprocess(
	(val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
	z.string().max(5000).optional()
);

const optionalNullableString = z.preprocess(
	(val) => (typeof val === 'string' && val.trim() === '' ? null : val),
	z.string().max(5000).nullable().optional()
);

const optionalNumber = (min: number, max: number) =>
	z.preprocess(
		(val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
		z.number().min(min).max(max).optional()
	);

const optionalInt = (min: number, max: number) =>
	z.preprocess(
		(val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
		z.number().int().min(min).max(max).optional()
	);

const booleanFromForm = z.preprocess(
	(val) => val === true || val === 'on' || val === 'true' || val === '1',
	z.boolean()
);

const optionalBooleanFromForm = z.preprocess(
	(val) => {
		if (val === '' || val === undefined || val === null) return undefined;
		if (val === true || val === 'on' || val === 'true' || val === '1') return true;
		if (val === false || val === 'off' || val === 'false' || val === '0') return false;
		return undefined;
	},
	z.boolean().optional()
);

const parseStringArray = (val: unknown): string[] => {
	if (Array.isArray(val)) return val.map(String).filter(Boolean);
	if (typeof val !== 'string' || val.trim() === '') return [];
	try {
		const parsed = JSON.parse(val) as unknown;
		if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
	} catch {
		return val
			.split(',')
			.map((item) => item.trim())
			.filter(Boolean);
	}
	return [];
};

const optionalDateString = z
	.string()
	.nullable()
	.optional()
	.transform((value) => (value && value.trim() !== '' ? value : null));

export const adminProgramSettingsSchema = z.object({
	id: z.string(),
	nutritionDaysAllocated: optionalInt(0, 1000).default(0),
	programStartDate: optionalDateString,
	photoValidationStatus: z.enum(['PENDING', 'VALIDATED']),
	photoValidatedAt: optionalDateString,
	bodyFatPercent: optionalNumber(3, 70),
	weightLossGoalKg: optionalNumber(0.5, 150),
	confirmRegenerate: z.string().optional()
});

export const adminUserProfileSchema = z.object({
	id: z.string(),
	activityLevel: activityLevelEnum.optional(),
	objectives: z.preprocess(parseStringArray, z.array(z.string())).default([]),
	painsPathologies: optionalString,
	contextParticular: optionalString,
	breadDaily: booleanFromForm.default(false),
	breadGramsPerDay: breadGramsPerDayField,
	breadType: breadTypeField,
	breadManagement: optionalString,
	allergens: z.preprocess(parseStringArray, z.array(allergenEnum).catch([])).default([]),
	coffeePerDay: optionalInt(0, 20),
	alcoholHabit: optionalBooleanFromForm,
	tobaccoHabit: optionalBooleanFromForm,
	breakfastEnabled: booleanFromForm.default(false),
	bodyFatPercent: optionalNumber(3, 70),
	weightLossGoalKg: optionalNumber(0.5, 150),
	intermittentFastingMorning: optionalBooleanFromForm,
	sportActivity: optionalString,
	familyCoefficients: z.preprocess((val) => {
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
	stressLevel: optionalInt(1, 10),
	sleepQuality: optionalInt(1, 10),
	bodyConfidence: optionalInt(1, 10),
	digestionQuality: optionalInt(1, 10),
	happinessLevel: optionalInt(1, 10),
	readinessToChange: optionalInt(1, 10),
	kitchenEquipment: z.preprocess(parseStringArray, z.array(z.string())).default([]),
	disgustingFoods: optionalString,
	otherAllergens: optionalString,
	physicalObjective: optionalString,
	eventMotivation: optionalString,
	addictionsText: optionalString,
	confirmRegenerate: z.string().optional()
});

export const adminBodyMeasurementSchema = z.object({
	id: z.string().optional(),
	createdAt: optionalDateString,
	age: optionalInt(10, 120),
	heightCm: optionalNumber(100, 250),
	weightKg: optionalNumber(30, 300),
	waistCm: optionalNumber(50, 200),
	chestCm: optionalNumber(50, 200),
	armCm: optionalNumber(15, 80),
	confirmRegenerate: z.string().optional()
});

export const adminBodyMeasurementDeleteSchema = z.object({
	id: z.string(),
	confirmRegenerate: z.string().optional()
});

export const adminProgressPhotoSchema = z.object({
	id: z.string().optional(),
	angle: z.enum(['FRONT', 'SIDE', 'BACK']),
	month: optionalInt(0, 12).default(0),
	url: z.string().startsWith('/api/cloudflare/r2/image/photos/'),
	uploadedAt: optionalDateString
});

export const adminMonthlyCheckInSchema = z.object({
	id: z.string().optional(),
	month: optionalInt(0, 12).default(0),
	stressLevel: optionalInt(1, 10),
	sleepQuality: optionalInt(1, 10),
	bodyConfidence: optionalInt(1, 10),
	digestionQuality: optionalInt(1, 10),
	happinessLevel: optionalInt(1, 10),
	readinessToChange: optionalInt(1, 10),
	pointsAwarded: booleanFromForm.default(false),
	nutritionRecalibrated: booleanFromForm.default(false),
	submittedAt: optionalDateString
});

export const adminNutritionDaySchema = z.object({
	id: z.string(),
	intermittentFasting: booleanFromForm.default(false)
});

export const adminMealSchema = z.object({
	id: z.string(),
	position: z.enum(['BREAKFAST', 'LUNCH', 'DINNER']),
	recipeId: optionalNullableString,
	quantityG: optionalNumber(0, 5000),
	calcProteinG: optionalNumber(0, 1000),
	calcCarbsG: optionalNumber(0, 1000),
	calcFatG: optionalNumber(0, 1000),
	calcCalories: optionalNumber(0, 10000),
	calcFiberG: optionalNumber(0, 1000),
	isManual: booleanFromForm.default(false),
	manualProteinG: optionalNumber(0, 1000),
	manualCarbsG: optionalNumber(0, 1000),
	manualFatG: optionalNumber(0, 1000),
	manualCalories: optionalNumber(0, 10000),
	manualFiberG: optionalNumber(0, 1000),
	eatenAt: optionalDateString
});

export const adminWorkoutDaySchema = z.object({
	id: z.string(),
	dayIndex: optionalInt(1, 1000),
	scheduledDate: optionalDateString,
	completedAt: optionalDateString,
	isLocked: booleanFromForm.default(false)
});

export const adminPointEventSchema = z.object({
	id: z.string().optional(),
	type: z.enum([
		'WORKOUT_COMPLETE',
		'VIDEO_WATCHED',
		'DAILY_TASK',
		'BADGE_UNLOCK',
		'CHALLENGE_COMPLETE',
		'PHOTO_UPLOAD',
		'POINT_SPENT',
		'MONTHLY_CHECKIN'
	]),
	amount: optionalInt(-100000, 100000).default(0),
	metadata: z.preprocess((val) => {
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
	createdAt: optionalDateString
});

export const adminUserBadgeSchema = z.object({
	id: z.string(),
	progress: optionalNumber(0, 1).default(0),
	unlockedAt: optionalDateString
});

export const adminDailyTaskCompletionSchema = z.object({
	id: z.string().optional(),
	taskId: z.string(),
	date: optionalDateString,
	completedAt: optionalDateString
});

export const adminDailyTaskOptOutSchema = z.object({
	id: z.string().optional(),
	taskId: z.string()
});

export const adminVideoProgressSchema = z.object({
	id: z.string(),
	maxPositionSec: optionalNumber(0, 100000).default(0),
	lastHeartbeatAt: optionalDateString,
	completedAt: optionalDateString
});

export const adminProgramDayItemCompletionSchema = z.object({
	id: z.string().optional(),
	programDayItemId: z.string(),
	completedAt: optionalDateString,
	stepsValue: optionalInt(0, 1000000)
});

export const adminUserChallengeSchema = z.object({
	id: z.string(),
	completedAt: optionalDateString
});

export type AdminUserProfile = z.infer<typeof adminUserProfileSchema>;
