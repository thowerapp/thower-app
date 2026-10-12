import { zod } from '$lib/superforms-zod';
import type { PageServerLoad, Actions } from './$types';
import { message, superValidate, fail } from 'sveltekit-superforms';
import { error, redirect } from '@sveltejs/kit';
import { recipeSchema } from '$lib/schema/recipe/recipeSchema';
import { prisma } from '$lib/server';
import { normalizeAllergens } from '$lib/schema/recipe/allergens';
import { invalidateRecipeCatalog } from '$lib/server/nutrition/recipeCatalog';
import { regenerateShoppingListsForRecipe } from '$lib/prisma/shoppingList/regenerateOverlappingDay';
import { serializeData } from '$lib/utils/serializeData';

export const load: PageServerLoad = async ({ params }) => {

	const recipe = await prisma.recipe.findUnique({
		where: { id: params.id },
		include: { ingredients: { orderBy: { order: 'asc' } } }
	});

	if (!recipe) throw error(404, 'Recette introuvable.');

	const form = await superValidate(
		{
			name: recipe.name,
			description: recipe.description,
			totalTimeMin: recipe.totalTimeMin,
			servings: recipe.servings,
			category: recipe.category,
			requiredKitchenEquipment: recipe.requiredKitchenEquipment ?? [],
			instructions: recipe.instructions,
			referenceYieldG: recipe.referenceYieldG,
			isCustom: recipe.isCustom,
			nutritionKcal: recipe.nutritionKcal,
			nutritionProteinG: recipe.nutritionProteinG,
			nutritionCarbsG: recipe.nutritionCarbsG,
			nutritionFatG: recipe.nutritionFatG,
			nutritionFiberG: recipe.nutritionFiberG,
			// Codes anglais du catalogue d'origine convertis : sans cela le formulaire les perdait à l'enregistrement.
			allergens: normalizeAllergens(recipe.allergens),
			ingredients: recipe.ingredients.map(
				(ing: {
					name: string;
					quantityG: number | null;
					unit: string | null;
					category: string | null;
					note: string | null;
					isOptional: boolean;
					order: number;
				}) => ({
					name: ing.name,
					quantityG: ing.quantityG,
					unit: ing.unit,
					category: ing.category,
					note: ing.note,
					isOptional: ing.isOptional,
					order: ing.order
				})
			)
		},
		zod(recipeSchema)
	);

	return {
		form,
		recipe: serializeData(recipe)
	};
};

export const actions: Actions = {
	updateRecipe: async ({ request, locals, params }) => {
		if (!locals.user || locals.role !== 'ADMIN') {
			return fail(403, { message: 'Accès refusé.' });
		}

		const form = await superValidate(request, zod(recipeSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const d = form.data;


		try {
			// Remplacement des ingrédients dans une transaction : un échec laisse la recette intacte.
			const deleteIngredients = prisma.recipeIngredient.deleteMany({ where: { recipeId: params.id } });
			const updateRecipe = prisma.recipe.update({
				where: { id: params.id },
				data: {
					name: d.name,
					description: d.description,
					totalTimeMin: d.totalTimeMin,
					servings: d.servings,
					category: d.category,
					requiredKitchenEquipment: d.requiredKitchenEquipment,
					instructions: d.instructions,
					referenceYieldG: d.referenceYieldG,
					isCustom: false,
					nutritionKcal: d.nutritionKcal,
					nutritionProteinG: d.nutritionProteinG,
					nutritionCarbsG: d.nutritionCarbsG,
					nutritionFatG: d.nutritionFatG,
					nutritionFiberG: d.nutritionFiberG,
					allergens: d.allergens,
					ingredients: {
						create: d.ingredients.map((ing, idx) => ({
							name: ing.name,
							quantityG: ing.quantityG,
							unit: ing.unit,
							category: ing.category,
							note: ing.note,
							isOptional: ing.isOptional,
							order: ing.order ?? idx
						}))
					}
				}
			});
			await prisma.$transaction([deleteIngredients, updateRecipe]);

			invalidateRecipeCatalog();
		} catch (err) {
			console.error('[admin/recettes/[id]] updateRecipe error', err);
			return fail(500, { form, message: 'Une erreur est survenue lors de la mise à jour.' });
		}

		// Listes de courses des repas qui utilisent la recette (comme `updateRecipe`).
		try {
			await regenerateShoppingListsForRecipe(params.id);
		} catch (err) {
			console.error('[admin/recettes/[id]] regenerateShoppingListsForRecipe error', err);
		}
		return message(form, 'Recette mise à jour.');
	}
};
