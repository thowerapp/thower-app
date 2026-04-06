import { z } from 'zod';
import { activityLevelEnum } from '$lib/schema/measurement/measurementSchema';
import { allergenEnum } from '$lib/schema/recipe/allergens';

export const shoppingListSortOrderEnum = z.enum(['category', 'alphabetical']);

export const familyCoefficientItemSchema = z.object({
	label: z.string(),
	coefficient: z.number().min(0).max(1)
});

export const profileSchema = z.object({
	activityLevel: activityLevelEnum.optional(),
	objectives: z
		.preprocess((val) => {
			if (Array.isArray(val)) return val;
			if (typeof val === 'string') return val ? (JSON.parse(val) as string[]) : [];
			return [];
		}, z.array(z.string()))
		.default([]),
	painsPathologies: z.string().max(2000).optional(),
	contextParticular: z.string().max(2000).optional(),
	breadManagement: z.string().max(2000).optional(),
	sportActivity: z.string().max(2000).optional(),
	allergens: z
		.preprocess((val) => {
			if (Array.isArray(val)) return val;
			if (typeof val === 'string') return val ? (JSON.parse(val) as string[]) : [];
			return [];
		}, z.array(allergenEnum).catch([]))
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
		}, z.union([z.array(familyCoefficientItemSchema), z.record(z.unknown())]).optional()),
	shoppingListSortOrder: shoppingListSortOrderEnum.optional()
});

export type ProfileSchema = z.infer<typeof profileSchema>;
