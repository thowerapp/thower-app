import { prisma } from '$lib/server';
export const getAllTransactions = async () => {
	try {
		// Requête pour obtenir toutes les transactions
		const transactions = await prisma.transaction.findMany();
		return transactions;
	} catch (error) {
		console.error('Error retrieving transactions: ', error);
	} finally {
		// Déconnecte Prisma Client à la fin
		await prisma.$disconnect();
	}
};
