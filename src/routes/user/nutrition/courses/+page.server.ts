import { fail, redirect } from '@sveltejs/kit';
import { getCurrentShoppingList } from '$lib/prisma/shoppingList/getCurrentList';
import { toggleShoppingItemChecked } from '$lib/prisma/shoppingList/toggleItemChecked';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) return redirect(302, '/auth/login');
	const list = await getCurrentShoppingList(locals.user.id);
	return { list };
};

export const actions: Actions = {
	toggleItem: async ({ request, locals }) => {
		if (!locals.user) return fail(401);
		const data = await request.formData();
		const itemId = data.get('itemId');
		const isChecked = data.get('isChecked') === 'true';
		if (typeof itemId !== 'string' || !itemId) return fail(400, { message: 'itemId manquant' });
		await toggleShoppingItemChecked(itemId, isChecked);
		return { success: true };
	}
};
