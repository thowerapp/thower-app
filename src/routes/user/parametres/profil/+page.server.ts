// src/routes/user/parametres/profil/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/auth/login');

	const userId = locals.user.id;

	const [user, profile, measurements, pointEvents, userBadges] = await Promise.all([
		prisma.user.findUnique({
			where: { id: userId },
			select: {
				name: true,
				email: true,
				username: true,
				picture: true,
				programStartDate: true,
				subscriptionEndsAt: true,
				nutritionDaysAllocated: true,
			}
		}),
		prisma.userProfile.findUnique({
			where: { userId },
			select: {
				activityLevel: true,
				objectives: true,
				painsPathologies: true,
				allergens: true,
				coffeePerDay: true,
				alcoholHabit: true,
				tobaccoHabit: true,
				breakfastEnabled: true,
				bodyFatPercent: true,
				weightLossGoalKg: true,
				intermittentFastingMorning: true,
				sportActivity: true,
				stressLevel: true,
				sleepQuality: true,
				bodyConfidence: true,
				digestionQuality: true,
				happinessLevel: true,
				readinessToChange: true,
				kitchenEquipment: true,
				physicalObjective: true,
			}
		}),
		prisma.bodyMeasurement.findFirst({
			where: { userId },
			orderBy: { createdAt: 'desc' },
			select: {
				age: true,
				heightCm: true,
				weightKg: true,
				waistCm: true,
				chestCm: true,
				armCm: true,
				createdAt: true,
			}
		}),
		prisma.pointEvent.findMany({ where: { userId }, select: { amount: true } }),
		prisma.userBadge.findMany({
			where: { userId },
			include: { badge: { select: { name: true } } },
			orderBy: { unlockedAt: 'desc' },
		}),
	]);

	// Calcul niveau
	const totalPoints = pointEvents.reduce((s, e) => s + e.amount, 0);
	const levels = [
		{ min: 0,    num: 1, name: 'Bambou en herbe',    nextMin: 200  },
		{ min: 200,  num: 2, name: 'Bambou Furieux',     nextMin: 500  },
		{ min: 500,  num: 3, name: 'Guerrier en devenir', nextMin: 1000 },
		{ min: 1000, num: 4, name: 'Guerrier Thower',    nextMin: 2000 },
		{ min: 2000, num: 5, name: 'Maître Thower',      nextMin: null },
	];
	const levelData = levels.slice().reverse().find(l => totalPoints >= l.min) ?? levels[0];
	const levelPercent = levelData.nextMin != null
		? Math.round(((totalPoints - levelData.min) / (levelData.nextMin - levelData.min)) * 100)
		: 100;

	return {
		user: user ?? null,
		profile: profile ?? null,
		measurements: measurements ?? null,
		totalPoints,
		levelData,
		levelPercent,
		badgesCount: userBadges.length,
		latestBadge: userBadges[0]?.badge.name ?? null,
	};
};
