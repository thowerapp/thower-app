import { z } from 'zod';
import { recipeIngredientSchema } from './recipeIngredientSchema';

export const recipeCategoryEnum = z.enum(['FIRST_3_MONTHS', 'NEW', 'CUSTOM']);

export const recipeSchema = z.object({
	name: z.string().min(1).max(200),
	photoUrl: z.string().url().optional().nullable().or(z.literal('')),
	prepTimeMin: z.number().int().min(0).optional().nullable(),
	cookTimeMin: z.number().int().min(0).optional().nullable(),
	category: recipeCategoryEnum,
	instructions: z.string().max(10000).optional().nullable(),
	isCustom: z.boolean().default(false),
	ingredients: z.array(recipeIngredientSchema).default([])
});

export type RecipeSchema = z.infer<typeof recipeSchema>;
