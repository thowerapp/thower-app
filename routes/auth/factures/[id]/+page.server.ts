import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getTransactionById } from '$lib/prisma/transaction/getTransactionById';

export const load = (async ({ params, locals }) => {
	if (locals.session === null || locals.user === null) {
		throw redirect(302, '/auth/login');
	}
	if (!locals.user.emailVerified) {
		throw redirect(302, '/auth/verify-email');
	}

	const transactionId = params.id;
	if (!transactionId) {
		throw new Error('Transaction ID is missing');
	}

	const transaction = await getTransactionById(transactionId);
	if (!transaction) {
		throw new Error(`No transaction found for ID: ${transactionId}`);
	}
	if (transaction.userId !== locals.user.id) {
		throw redirect(302, '/auth/factures');
	}

	return {
		transaction
	};
}) satisfies PageServerLoad;
