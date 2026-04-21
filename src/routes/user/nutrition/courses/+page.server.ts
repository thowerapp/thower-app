import { fail, redirect } from '@sveltejs/kit';
import { getCurrentShoppingList } from '$lib/prisma/shoppingList/getCurrentList';
import { toggleShoppingItemChecked } from '$lib/prisma/shoppingList/toggleItemChecked';
import { generateShoppingListFromPlanning } from '$lib/prisma/shoppingList/generateFromPlanning';
import { requireNutritionAccess } from '$lib/server/programAccessGuard';
import { prisma } from '$lib/server';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) return redirect(302, '/auth/login');
	const list = await getCurrentShoppingList(locals.user.id);
	return { list };
};

export const actions: Actions = {
	toggleItem: async ({ request, locals }) => {
		if (!locals.user) return fail(401);
		await requireNutritionAccess(locals.user.id, locals.user.role);
		const data = await request.formData();
		const itemId = data.get('itemId');
		const isChecked = data.get('isChecked') === 'true';
		if (typeof itemId !== 'string' || !itemId) return fail(400, { message: 'itemId manquant' });
		await toggleShoppingItemChecked(itemId, isChecked);
		return { success: true };
	},

	regenerate: async ({ locals }) => {
		if (!locals.user) return fail(401);
		await requireNutritionAccess(locals.user.id, locals.user.role);
		const userId = locals.user.id;

		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { nutritionDaysAllocated: true }
		});
		const targetDays = user?.nutritionDaysAllocated ?? 0;
		if (targetDays < 1) return fail(400, { message: 'Aucun jour de programme alloué.' });

		const result = await generateShoppingListFromPlanning(userId, 1, targetDays, {
			includeReportedFromPrevious: false
		});
		if (!result) return fail(500, { message: 'Erreur lors de la génération de la liste.' });
		return { success: true };
	}
};
