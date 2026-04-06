import { prisma } from '$lib/server';
import type { RecipeCategory } from '@prisma/client';
import type { RecipeKitchenEquipmentValue } from '$lib/schema/recipe/recipeKitchenEquipment';

export type CreateRecipeIngredientInput = {
	name: string;
	quantityG?: number | null;
	unit?: string | null;
	category?: string | null;
	order?: number;
	note?: string | null;
	isOptional?: boolean;
	allergens?: string[];
};

export type CreateRecipeData = {
	name: string;
	description?: string | null;
	totalTimeMin?: number | null;
	servings?: number;
	category: RecipeCategory;
	requiredKitchenEquipment?: RecipeKitchenEquipmentValue[];
	instructions?: string | null;
	isCustom?: boolean;
	userId?: string | null;
	referenceYieldG?: number | null;
	nutritionKcal?: number | null;
	nutritionProteinG?: number | null;
	nutritionCarbsG?: number | null;
	nutritionFatG?: number | null;
	nutritionFiberG?: number | null;
	ingredients?: CreateRecipeIngredientInput[];
};

export async function createRecipe(data: CreateRecipeData) {
	const client = prisma as unknown as {
		recipe?: {
			create: (args: {
				data: unknown;
			}) => Promise<unknown>;
		};
	};
	if (!client?.recipe) {
		throw new Error('Prisma client has no "recipe" model. Run: npx prisma generate');
	}
	const { ingredients, ...rest } = data;
	return client.recipe.create({
		data: {
			...rest,
			requiredKitchenEquipment: data.requiredKitchenEquipment ?? [],
			isCustom: data.isCustom ?? false,
			userId: data.userId ?? undefined,
			servings: data.servings ?? 1,
			referenceYieldG: data.referenceYieldG ?? undefined,
			ingredients: ingredients?.length
				? {
						create: ingredients.map((i, idx) => ({
							name: i.name,
							quantityG: i.quantityG === undefined ? undefined : i.quantityG,
							unit: i.unit === undefined ? undefined : i.unit,
							category: i.category === undefined ? undefined : i.category,
							order: i.order ?? idx,
							note: i.note === undefined ? undefined : i.note,
							isOptional: i.isOptional ?? false,
							allergens: i.allergens ?? []
						}))
					}
				: undefined
		}
	});
}
