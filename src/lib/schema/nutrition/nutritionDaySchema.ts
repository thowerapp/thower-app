import { z } from 'zod';

export const nutritionDaySchema = z.object({
	dayIndex: z.number().int().min(1).max(91),
	intermittentFasting: z.boolean().default(false)
});

export type NutritionDaySchema = z.infer<typeof nutritionDaySchema>;
