import { zod } from '$lib/superforms-zod';
import type { PageServerLoad, Actions } from './$types';
import { message, superValidate, fail } from 'sveltekit-superforms';
import { redirect } from '@sveltejs/kit';
import { recipeSchema, type RecipeSchema } from '$lib/schema/recipe/recipeSchema';
import { createRecipe } from '$lib/prisma/recipe/createRecipe';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/auth/login');
	if (locals.role !== 'ADMIN') throw redirect(302, '/');

	const form = await superValidate(zod(recipeSchema));
	return { form };
};

export const actions: Actions = {
	createRecipe: async ({ request, locals }) => {
		if (!locals.user || locals.role !== 'ADMIN') {
			return fail(403, { message: 'Accès refusé.' });
		}

		const form = await superValidate(request, zod(recipeSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const d = form.data as RecipeSchema;

		try {
			await createRecipe({
				name: d.name,
				description: d.description,
				totalTimeMin: d.totalTimeMin,
				servings: d.servings,
				category: d.category,
				requiredKitchenEquipment: d.requiredKitchenEquipment,
				instructions: d.instructions,
				referenceYieldG: d.referenceYieldG,
				nutritionKcal: d.nutritionKcal,
				nutritionProteinG: d.nutritionProteinG,
				nutritionCarbsG: d.nutritionCarbsG,
				nutritionFatG: d.nutritionFatG,
				nutritionFiberG: d.nutritionFiberG,
				allergens: d.allergens,
				isCustom: false,
				userId: null,
				ingredients: d.ingredients.map((ing, idx) => ({
					name: ing.name,
					quantityG: ing.quantityG,
					unit: ing.unit,
					category: ing.category,
					note: ing.note,
					isOptional: ing.isOptional,
					order: ing.order ?? idx
				}))
			});
			throw redirect(302, '/admin/recettes');
		} catch (err) {
			if ((err as { status?: number }).status === 302) throw err;
			console.error('[admin/recettes/create] createRecipe error', err);
			return fail(500, { form, message: 'Une erreur est survenue lors de la création.' });
		}
	}
};
