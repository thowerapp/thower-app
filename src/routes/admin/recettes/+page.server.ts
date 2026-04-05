import { zod } from '$lib/superforms-zod';
import type { PageServerLoad, Actions } from './$types';
import { message, superValidate, fail } from 'sveltekit-superforms';
import { redirect } from '@sveltejs/kit';
import { deleteRecipeSchema } from '$lib/schema/recipe/recipeSchema';
import { prisma } from '$lib/server';
import { serializeData } from '$lib/utils/serializeData';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/auth/login');
	if (locals.role !== 'ADMIN') throw redirect(302, '/');

	const IdeleteRecipeSchema = await superValidate(zod(deleteRecipeSchema));

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const db = prisma as any;
	const rawRecipes = db.recipe
		? await db.recipe.findMany({
				where: { isCustom: false },
				include: { ingredients: true },
				orderBy: { createdAt: 'desc' }
			})
		: [];

	return {
		IdeleteRecipeSchema,
		recipes: serializeData(rawRecipes)
	};
};

export const actions: Actions = {
	deleteRecipe: async ({ request, locals }) => {
		if (!locals.user || locals.role !== 'ADMIN') {
			return fail(403, { message: 'Accès refusé.' });
		}

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const form = await superValidate(formData, zod(deleteRecipeSchema));

		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await (prisma as any).recipe.delete({ where: { id } });
			return message(form, 'Recette supprimée.');
		} catch (error) {
			console.error('[admin/recettes] deleteRecipe error', error);
			return fail(500, { form, message: 'Erreur lors de la suppression.' });
		}
	}
};
