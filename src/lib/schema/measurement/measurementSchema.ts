import { z } from 'zod';

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

export const measurementSchema = z.object({
	age: optionalNumber(10, 120),
	heightCm: optionalNumber(100, 250),
	weightKg: optionalNumber(30, 300),
	waistCm: optionalNumber(50, 200),
	chestCm: optionalNumber(50, 200),
	armCm: optionalNumber(15, 80),

	// FormData envoie 'on' | 'off' (radio) ; pas de z.union pour rester compatible FormData
	intermittentFastingMorning: z
		.preprocess(
			(val) => (val === true || val === 'on' ? true : val === false || val === 'off' ? false : undefined),
			z.boolean().optional()
		),

	activityLevel: activityLevelEnum.optional(),

	painsPathologies: z.string().max(2000).optional(),
	contextParticular: z.string().max(2000).optional(),
	breadManagement: z.string().max(2000).optional(),
	sportActivity: z.string().max(2000).optional(),

	objectives: z
		.preprocess((val) => {
			if (Array.isArray(val)) return val;
			if (typeof val === 'string') return val ? (JSON.parse(val) as string[]) : [];
			return [];
		}, z.array(z.string()))
		.default([])
});

export type MeasurementSchema = z.infer<typeof measurementSchema>;
