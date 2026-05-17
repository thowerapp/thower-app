// src/routes/user/parametres/profil/+page.server.ts
import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/auth/login');

	const userId = locals.user.id;

	const [user, profile, measurements, pointEvents, userBadges, dailyTasks, optOuts] = await Promise.all([
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
		prisma.dailyTask.findMany({
			where: { active: true },
			orderBy: { order: 'asc' },
			select: { id: true, label: true, points: true }
		}),
		prisma.userDailyTaskOptOut.findMany({
			where: { userId },
			select: { taskId: true }
		}),
	]);

	// Calcul statut (spec : 6 statuts basés sur scorePercent)
	const totalPoints = pointEvents.reduce((s, e) => s + e.amount, 0);
	const [activeTasks, completions] = await Promise.all([
		prisma.dailyTask.count({ where: { active: true } }),
		prisma.dailyTaskCompletion.count({ where: { userId } })
	]);
	const programStart = user?.programStartDate;
	let currentDayIndex = 1;
	if (programStart) {
		const diff = Math.floor((Date.now() - new Date(programStart).setUTCHours(0,0,0,0)) / 86_400_000);
		currentDayIndex = Math.min(Math.max(diff + 1, 1), 91);
	}
	const expectedCompletions = activeTasks * currentDayIndex;
	const scorePercent = expectedCompletions > 0 ? Math.round((completions / expectedCompletions) * 100) : 0;

	const statuts = [
		{ minPercent: 100, num: 6, name: 'Titan Légendaire',    next: null,                  nextMin: null },
		{ minPercent: 98,  num: 5, name: 'Héro Millénium',      next: 'Titan Légendaire',    nextMin: 100  },
		{ minPercent: 94,  num: 4, name: 'Guerrier en devenir', next: 'Héro Millénium',      nextMin: 98   },
		{ minPercent: 90,  num: 3, name: 'Bambou Furieux',      next: 'Guerrier en devenir', nextMin: 94   },
		{ minPercent: 86,  num: 2, name: 'Éponge molle',        next: 'Bambou Furieux',      nextMin: 90   },
		{ minPercent: 0,   num: 1, name: 'Gland de chêne',      next: 'Éponge molle',        nextMin: 86   },
	];
	const levelData = statuts.find((s) => scorePercent >= s.minPercent) ?? statuts[statuts.length - 1];
	const levelPercent = levelData.next != null && levelData.nextMin != null
		? Math.round(((scorePercent - levelData.minPercent) / (levelData.nextMin - levelData.minPercent)) * 100)
		: 100;

	const optOutIds = new Set(optOuts.map((o) => o.taskId));

	return {
		user: user ?? null,
		profile: profile ?? null,
		measurements: measurements ?? null,
		totalPoints,
		levelData,
		levelPercent,
		badgesCount: userBadges.length,
		latestBadge: userBadges[0]?.badge.name ?? null,
		dailyTasks,
		optOutIds: Array.from(optOutIds),
	};
};

export const actions: Actions = {
	toggleTaskOptOut: async ({ request, locals }) => {
		if (!locals.user) return fail(401);
		const userId = locals.user.id;
		const fd = await request.formData();
		const taskId = fd.get('taskId');
		const optOut = fd.get('optOut') === 'true';
		if (typeof taskId !== 'string' || !taskId) return fail(400, { error: 'taskId manquant' });
		try {
			if (optOut) {
				await prisma.userDailyTaskOptOut.upsert({
					where: { userId_taskId: { userId, taskId } },
					create: { userId, taskId },
					update: {}
				});
			} else {
				await prisma.userDailyTaskOptOut.deleteMany({ where: { userId, taskId } });
			}
			return { success: true };
		} catch (e) {
			console.error('[profil toggleTaskOptOut]', e);
			return fail(500, { error: 'Erreur serveur' });
		}
	}
};
