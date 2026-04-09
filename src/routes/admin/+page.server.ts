import { getAllTransactionsDashboard } from '$lib/prisma/transaction/getAllTransactionsDashboard';
import { latestUsers } from '$lib/prisma/user/user';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [transactions, latestUsersFetch] = await Promise.all([
		getAllTransactionsDashboard(),
		latestUsers()
	]);
	return {
		latestUsersFetch,
		transactions,
		user: locals.user,
		role: locals.role
	};
};
