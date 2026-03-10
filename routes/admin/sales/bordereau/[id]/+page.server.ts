import type { PageServerLoad } from './$types';
import { getTransactionById } from '$lib/prisma/transaction/getTransactionById';

export const load = (async ({ params }) => {
	// Récupérer l'ID depuis l'URL
	const transactionId = params.id;

	// Vérifier si l'ID est valide
	if (!transactionId) {
		throw new Error('Transaction ID is missing');
	}

	// Récupérer la transaction
	const transaction = await getTransactionById(transactionId);

	// Vérifier si la transaction existe
	if (!transaction) {
		throw new Error(`No transaction found for ID: ${transactionId}`);
	}

	return {
		transaction
	};
}) satisfies PageServerLoad;
