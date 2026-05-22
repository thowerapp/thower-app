import { prisma } from '$lib/server';
import { programGenTrace } from './programGenerationLog';

/** Résumé BDD après génération (ou abandon) — confirmé dans les logs `[program-gen]`. */
export async function logProgramGenSummary(
	userId: string,
	status: 'created' | 'already_complete' | 'shopping_only' | 'aborted' | 'skipped',
	extra?: Record<string, unknown>
): Promise<void> {
	const [nutritionDayCount, mealCount, shoppingList, user] = await Promise.all([
		prisma.nutritionDay.count({ where: { userId } }),
		prisma.meal.count({ where: { nutritionDay: { userId } } }),
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(prisma as any).shoppingList?.findFirst?.({
			where: { userId },
			select: { id: true }
		}) ?? Promise.resolve(null),
		prisma.user.findUnique({
			where: { id: userId },
			select: {
				nutritionDaysAllocated: true,
				programStartDate: true,
				subscriptionEndsAt: true
			}
		})
	]);

	programGenTrace('generate_done', {
		userId,
		status,
		nutritionDaysInDb: nutritionDayCount,
		mealsInDb: mealCount,
		hasShoppingList: shoppingList != null,
		nutritionDaysAllocated: user?.nutritionDaysAllocated ?? 0,
		programStartDate: user?.programStartDate?.toISOString() ?? null,
		subscriptionEndsAt: user?.subscriptionEndsAt?.toISOString() ?? null,
		...extra
	});
}
