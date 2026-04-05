import { z } from 'zod';

export const recipeIngredientSchema = z.object({
	name: z.string().min(1).max(300),
	quantityG: z.number().positive().optional().nullable(),
	unit: z.string().max(50).optional().nullable(),
	category: z.string().max(100).optional().nullable(),
	order: z.number().int().min(0).default(0),
	note: z.string().max(500).optional().nullable(),
	isOptional: z.boolean().default(false),
	allergens: z.array(z.string()).default([])
});

export type RecipeIngredientSchema = z.infer<typeof recipeIngredientSchema>;
