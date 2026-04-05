import { zod } from '$lib/superforms-zod';
import type { PageServerLoad, Actions } from './$types';
import { message, superValidate, fail } from 'sveltekit-superforms';
import { error, redirect } from '@sveltejs/kit';
import { recipeSchema, type RecipeSchema } from '$lib/schema/recipe/recipeSchema';
import { prisma } from '$lib/server';
import { serializeData } from '$lib/utils/serializeData';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) throw redirect(302, '/auth/login');
	if (locals.role !== 'ADMIN') throw redirect(302, '/');

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const db = prisma as any;

	const recipe = db.recipe
		? await db.recipe.findUnique({
				where: { id: params.id },
				include: { ingredients: { orderBy: { order: 'asc' } } }
			})
		: null;

	if (!recipe) throw error(404, 'Recette introuvable.');

	const form = await superValidate(
		{
			name: recipe.name,
			description: recipe.description,
			totalTimeMin: recipe.totalTimeMin,
			servings: recipe.servings,
			category: recipe.category,
			instructions: recipe.instructions,
			referenceYieldG: recipe.referenceYieldG,
			isCustom: recipe.isCustom,
			nutritionKcal: recipe.nutritionKcal,
			nutritionProteinG: recipe.nutritionProteinG,
			nutritionCarbsG: recipe.nutritionCarbsG,
			nutritionFatG: recipe.nutritionFatG,
			nutritionFiberG: recipe.nutritionFiberG,
			ingredients: recipe.ingredients.map(
				(ing: {
					name: string;
					quantityG: number | null;
					unit: string | null;
					category: string | null;
					note: string | null;
					isOptional: boolean;
					allergens: string[];
					order: number;
				}) => ({
					name: ing.name,
					quantityG: ing.quantityG,
					unit: ing.unit,
					category: ing.category,
					note: ing.note,
					isOptional: ing.isOptional,
					allergens: ing.allergens ?? [],
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

		const d = form.data as RecipeSchema;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const db = prisma as any;

		try {
			// Supprimer les anciens ingrédients et recréer (stratégie replace pour MongoDB)
			await db.recipeIngredient.deleteMany({ where: { recipeId: params.id } });

			await db.recipe.update({
				where: { id: params.id },
				data: {
					name: d.name,
					description: d.description,
					totalTimeMin: d.totalTimeMin,
					servings: d.servings,
					category: d.category,
					instructions: d.instructions,
					referenceYieldG: d.referenceYieldG,
					isCustom: false,
					nutritionKcal: d.nutritionKcal,
					nutritionProteinG: d.nutritionProteinG,
					nutritionCarbsG: d.nutritionCarbsG,
					nutritionFatG: d.nutritionFatG,
					nutritionFiberG: d.nutritionFiberG,
					ingredients: {
						create: d.ingredients.map((ing, idx) => ({
							name: ing.name,
							quantityG: ing.quantityG,
							unit: ing.unit,
							category: ing.category,
							note: ing.note,
							isOptional: ing.isOptional,
							allergens: ing.allergens,
							order: ing.order ?? idx
						}))
					}
				}
			});

			return message(form, 'Recette mise à jour.');
		} catch (err) {
			console.error('[admin/recettes/[id]] updateRecipe error', err);
			return fail(500, { form, message: 'Une erreur est survenue lors de la mise à jour.' });
		}
	}
};
