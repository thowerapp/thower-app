import { z } from 'zod';
import { recipeIngredientSchema, type RecipeIngredientSchema } from './recipeIngredientSchema';
import { recipeKitchenEquipmentEnum, type RecipeKitchenEquipmentValue } from './recipeKitchenEquipment';
import { allergenEnum, type AllergenValue } from './allergens';

export const recipeCategoryEnum = z.enum(['BREAKFAST', 'MEAL', 'DESSERT']);

export type RecipeCategory = z.infer<typeof recipeCategoryEnum>;

export const recipeSchema = z.object({
	name: z.string().min(1, 'Le nom est requis.').max(200, 'Nom trop long.'),
	description: z.string().max(5000, 'Description trop longue.').optional().nullable(),
	totalTimeMin: z.number().int().min(0, 'Temps invalide.').optional().nullable(),
	servings: z.number().int().min(1, 'Minimum 1 portion.').default(1),
	category: recipeCategoryEnum,
	requiredKitchenEquipment: z.array(recipeKitchenEquipmentEnum).default([]),
	instructions: z.string().max(10000, 'Instructions trop longues.').optional().nullable(),
	referenceYieldG: z.number().positive('Doit être positif.').optional().nullable(),
	isCustom: z.boolean().default(false),
	nutritionKcal: z.number().nonnegative().optional().nullable(),
	nutritionProteinG: z.number().nonnegative().optional().nullable(),
	nutritionCarbsG: z.number().nonnegative().optional().nullable(),
	nutritionFatG: z.number().nonnegative().optional().nullable(),
	nutritionFiberG: z.number().nonnegative().optional().nullable(),
	allergens: z.array(allergenEnum).catch([]).default([]),
	ingredients: z.array(recipeIngredientSchema).default([])
});

export const deleteRecipeSchema = z.object({
	id: z.string().min(1)
});

export type DeleteRecipeSchema = z.infer<typeof deleteRecipeSchema>;

/** Données formulaire recette (explicite pour Superforms / bindings TS) */
export type RecipeSchema = {
	name: string;
	description?: string | null;
	totalTimeMin?: number | null;
	servings: number;
	category: RecipeCategory;
	requiredKitchenEquipment: RecipeKitchenEquipmentValue[];
	instructions?: string | null;
	referenceYieldG?: number | null;
	isCustom: boolean;
	nutritionKcal?: number | null;
	nutritionProteinG?: number | null;
	nutritionCarbsG?: number | null;
	nutritionFatG?: number | null;
	nutritionFiberG?: number | null;
	allergens: AllergenValue[];
	ingredients: RecipeIngredientSchema[];
};
