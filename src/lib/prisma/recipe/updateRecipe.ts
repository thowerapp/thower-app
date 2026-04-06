import { prisma } from '$lib/server';
import type { RecipeKitchenEquipmentValue } from '$lib/schema/recipe/recipeKitchenEquipment';
import { regenerateShoppingListsForRecipe } from '../shoppingList/regenerateOverlappingDay';

export type UpdateRecipeData = {
	name?: string;
	description?: string | null;
	totalTimeMin?: number | null;
	servings?: number;
	requiredKitchenEquipment?: RecipeKitchenEquipmentValue[];
	instructions?: string | null;
	active?: boolean;
	isCustom?: boolean;
	referenceYieldG?: number | null;
	nutritionKcal?: number | null;
	nutritionProteinG?: number | null;
	nutritionCarbsG?: number | null;
	nutritionFatG?: number | null;
	nutritionFiberG?: number | null;
};

export async function updateRecipe(recipeId: string, data: UpdateRecipeData) {
	const client = prisma as {
		recipe?: {
			update: (args: { where: { id: string }; data: unknown }) => Promise<unknown>;
		};
	};
	if (!client?.recipe) {
		throw new Error('Prisma client has no "recipe" model. Run: npx prisma generate');
	}
	await client.recipe.update({
		where: { id: recipeId },
		data
	});

	// MAJ auto liste de courses (Lot 6) : régénérer les listes qui utilisent cette recette
	await regenerateShoppingListsForRecipe(recipeId);
}
