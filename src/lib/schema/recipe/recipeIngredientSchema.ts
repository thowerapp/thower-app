import { z } from 'zod';

export const recipeIngredientSchema = z.object({
	name: z.string().min(1).max(200),
	quantityG: z.number().positive(),
	unit: z.string().max(50).optional().nullable(),
	allergens: z.array(z.string()).default([])
});

export type RecipeIngredientSchema = z.infer<typeof recipeIngredientSchema>;
