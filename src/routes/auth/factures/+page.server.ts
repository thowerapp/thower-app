import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getTransactionsByUserId } from '$lib/prisma/transaction/getTransactionsByUserId';

export const load = (async ({ locals }) => {
	if (locals.session === null || locals.user === null) {
		throw redirect(302, '/auth/login');
	}
	if (!locals.user.emailVerified) {
		throw redirect(302, '/auth/verify-email');
	}

	const transactions = await getTransactionsByUserId(locals.user.id);

	return {
		transactions
	};
}) satisfies PageServerLoad;
