/**
 * Recalcule les portions de tous les repas futurs (non manuels) de tous les utilisateurs avec
 * computeMealPortion ($lib/nutrition/mealPortion), puis régénère les listes de courses concernées.
 * À lancer une fois après le déploiement du nouveau calcul nutrition.
 *
 * Usage :
 *   npm run rescale:all-meals             # tous les utilisateurs ayant un planning
 *   npm run rescale:all-meals -- <email>  # un seul utilisateur
 */
import { prisma } from '$lib/server';
import { rescaleFutureMeals } from '$lib/server/nutrition/rescaleFutureMeals';
import { generateShoppingListFromPlanning } from '$lib/prisma/shoppingList/generateFromPlanning';

async function main() {
	const email = process.argv[2];
	const users = email
		? await prisma.user.findMany({ where: { email }, select: { id: true, email: true } })
		: await prisma.user.findMany({
				where: { nutritionDays: { some: {} } },
				select: { id: true, email: true }
			});

	if (users.length === 0) {
		console.error(email ? `Aucun utilisateur avec l'email ${email}` : 'Aucun utilisateur avec un planning nutrition');
		process.exitCode = 1;
		return;
	}

	for (const user of users) {
		await rescaleFutureMeals(user.id);
		const lists = await prisma.shoppingList.findMany({
			where: { userId: user.id },
			select: { startDayIndex: true, endDayIndex: true }
		});
		for (const { startDayIndex, endDayIndex } of lists) {
			await generateShoppingListFromPlanning(user.id, startDayIndex, endDayIndex, {
				includeReportedFromPrevious: true
			});
		}
		console.log(`${user.email} → repas futurs recalculés, ${lists.length} liste(s) de courses régénérée(s)`);
	}
}

main()
	.catch((err) => {
		console.error(err);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
