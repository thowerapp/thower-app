import { prisma } from '$lib/server';
import { currentProgramDayIndex } from '$lib/utils/programDay';
import { generateProgramForUser } from './generateProgramForUser';
import { programGenLog, programGenTrace, type ProgramGenSource } from './programGenerationLog';

async function resolveFirstFutureDayIndex(userId: string): Promise<number> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { programStartDate: true }
	});

	return Math.max(1, currentProgramDayIndex(user?.programStartDate ?? null));
}

export async function regenerateFutureProgramForUser(
	userId: string,
	source: ProgramGenSource = 'admin'
): Promise<{ firstFutureDayIndex: number; deletedMeals: number; deletedShoppingLists: number }> {
	const firstFutureDayIndex = await resolveFirstFutureDayIndex(userId);

	programGenTrace('admin_future_regen_start', { userId, source, firstFutureDayIndex });
	programGenLog('ADMIN/ Régénération future — invalidation contrôlée', {
		userId,
		source,
		firstFutureDayIndex
	});

	const deletedMeals = await prisma.meal.deleteMany({
		where: {
			eatenAt: null,
			nutritionDay: {
				userId,
				dayIndex: { gte: firstFutureDayIndex }
			}
		}
	});

	const deletedShoppingLists = await prisma.shoppingList.deleteMany({
		where: {
			userId,
			endDayIndex: { gte: firstFutureDayIndex }
		}
	});

	programGenLog('ADMIN/ Régénération future — lignes supprimées', {
		userId,
		firstFutureDayIndex,
		deletedMeals: deletedMeals.count,
		deletedShoppingLists: deletedShoppingLists.count
	});

	await generateProgramForUser(userId, source);

	programGenTrace('admin_future_regen_complete', {
		userId,
		source,
		firstFutureDayIndex,
		deletedMeals: deletedMeals.count,
		deletedShoppingLists: deletedShoppingLists.count
	});

	return {
		firstFutureDayIndex,
		deletedMeals: deletedMeals.count,
		deletedShoppingLists: deletedShoppingLists.count
	};
}
