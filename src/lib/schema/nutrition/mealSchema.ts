import { z } from 'zod';

export const mealPositionEnum = z.enum(['BREAKFAST', 'LUNCH', 'DINNER']);

export const mealSchema = z.object({
	position: mealPositionEnum,
	recipeId: z.string().optional().nullable(),
	quantityG: z.number().min(0).optional().nullable(),
	calcProteinG: z.number().min(0).optional().nullable(),
	calcCarbsG: z.number().min(0).optional().nullable(),
	calcFatG: z.number().min(0).optional().nullable(),
	calcCalories: z.number().min(0).optional().nullable(),
	isManual: z.boolean().default(false),
	manualProteinG: z.number().min(0).optional().nullable(),
	manualCarbsG: z.number().min(0).optional().nullable(),
	manualFatG: z.number().min(0).optional().nullable(),
	manualCalories: z.number().min(0).optional().nullable()
});

export type MealSchema = z.infer<typeof mealSchema>;
