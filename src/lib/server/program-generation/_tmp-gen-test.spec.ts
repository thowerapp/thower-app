import { describe, it } from 'vitest';
import { prisma } from '$lib/server';
import { generateProgramForUser } from './generateProgramForUser';

describe('tmp e2e generation probe', () => {
	it('generates a full program for a fresh user with no transactions', async () => {
		const email = 'newfresh@thower.test';
		let user = await prisma.user.findUnique({ where: { email } });
		if (!user) {
			user = await prisma.user.create({
				data: {
					email,
					username: 'newfresh.test',
					name: 'Fresh Test',
					passwordHash: 'x',
					emailVerified: true,
					role: 'CLIENT'
				}
			});
			console.log('created user', user.id);
		} else {
			console.log('reusing user', user.id);
		}

		await generateProgramForUser(user.id, 'internal');

		const refreshed = await prisma.user.findUnique({
			where: { id: user.id },
			select: { programStartDate: true }
		});
		const ndCount = await prisma.nutritionDay.count({ where: { userId: user.id } });
		const mealCount = await prisma.meal.count({ where: { nutritionDay: { userId: user.id } } });
		const mealsWithRecipe = await prisma.meal.count({
			where: { nutritionDay: { userId: user.id }, recipeId: { not: null } }
		});
		console.log('RESULT', {
			programStartDate: refreshed?.programStartDate,
			ndCount,
			mealCount,
			mealsWithRecipe
		});

		// Sport side: is there any ProgramDay/ProgramDayItem structure with videos attached?
		const programDayItemsTotal = await (prisma as any).programDayItem.count({});
		const programDayItemsWithVideo = await (prisma as any).programDayItem.count({
			where: { workoutVideoId: { not: null } }
		});
		const programDayItemsWithDiscovery = await (prisma as any).programDayItem.count({
			where: { discoveryContentId: { not: null } }
		});
		const workoutVideoTotal = await (prisma as any).workoutVideo.count({});
		console.log('RESULT sport', {
			programDayItemsTotal,
			programDayItemsWithVideo,
			programDayItemsWithDiscovery,
			workoutVideoTotal
		});
	}, 60000);
});
