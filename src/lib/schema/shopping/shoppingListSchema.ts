import { z } from 'zod';

export const shoppingListSchema = z.object({
	startDayIndex: z.number().int().min(1).max(91),
	endDayIndex: z.number().int().min(1).max(91)
}).refine((data) => data.endDayIndex >= data.startDayIndex, {
	message: 'endDayIndex doit être >= startDayIndex',
	path: ['endDayIndex']
});

export type ShoppingListSchema = z.infer<typeof shoppingListSchema>;
