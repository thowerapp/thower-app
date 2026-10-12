// src/routes/user/progression/+page.server.ts
import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server';
import { getTotalPointsForUser } from '$lib/prisma/pointEvent/getTotalPointsForUser';
import { POINTS } from '$lib/server/pointsConfig';
import { z } from 'zod';
import { todayStartParis } from '$lib/utils/programDay';
import { absoluteProgressMonth, programCycleSelect, resolveProgramCycle } from '$lib/utils/programCycle';
import { getUserProgramCycle } from '$lib/server/programCycle';
import { awardPoints } from '$lib/server/awardPoints';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/auth/login');

	const userId = locals.user.id;
	const todayStartProg = todayStartParis();

	// Aucune de ces requêtes ne dépend d'une autre (seule photosByAngle, ci-dessous,
	// a besoin de currentMonth qui vient de `user`) : une seule vague.
	const [
		user,
		totalPoints,
		workoutCount,
		userBadges,
		activeTaskDetails,
		todayCompletions,
		inscriptionPhotosByAngle,
		monthlyCheckIns
	] = await Promise.all([
		prisma.user.findUnique({ where: { id: userId }, select: programCycleSelect }),
		getTotalPointsForUser(userId),
		prisma.userWorkoutDay.count({ where: { userId, completedAt: { not: null } } }),
		prisma.userBadge.findMany({
			where: { userId },
			include: { badge: true },
			orderBy: { unlockedAt: 'desc' }
		}),
		prisma.dailyTask.findMany({
			where: { active: true },
			select: { points: true, showFromDay: true, showUntilDay: true }
		}),
		prisma.dailyTaskCompletion.count({ where: { userId, date: todayStartProg } }),
		prisma.progressPhoto.findMany({
			where: { userId, month: 0 },
			select: { angle: true, url: true }
		}),
		prisma.monthlyCheckIn.findMany({ where: { userId }, orderBy: { month: 'asc' } })
	]);

	const cycle = resolveProgramCycle(user);
	const programStart = cycle.start;
	const currentDayIndex = cycle.dayIndex;
	const currentWeek = currentDayIndex > 0 ? Math.ceil(currentDayIndex / 7) : 1;

	const activeTasks = activeTaskDetails.length;
	const scorePercent =
		activeTasks > 0 ? Math.min(100, Math.round((todayCompletions / activeTasks) * 100)) : 0;

	// ─── Photos du mois (dépend de currentMonth, donc requête séparée) ──────
	// Mois de suivi absolu : 1..3 au cycle 1, 4..6 au cycle 2…
	const currentMonth = absoluteProgressMonth(cycle, currentDayIndex);
	const photosByAngle = await prisma.progressPhoto.findMany({
		where: { userId, month: currentMonth },
		select: { angle: true, url: true }
	});
	const photoMap: Record<string, string | null> = { FRONT: null, SIDE: null, BACK: null };
	for (const p of photosByAngle) photoMap[p.angle] = p.url;

	const inscriptionPhotoMap: Record<string, string | null> = { FRONT: null, SIDE: null, BACK: null };
	for (const p of inscriptionPhotosByAngle) inscriptionPhotoMap[p.angle] = p.url;

	const currentMonthCheckIn = monthlyCheckIns.find((c) => c.month === currentMonth);
	const checkInDue = currentMonth >= 2 && !currentMonthCheckIn;


	// ─── Statut Thower — % des points possibles obtenus (spec cahier des charges) ──
	// Points possibles = somme pondérée des tâches actives sur les jours écoulés + check-ins
	const taskPossiblePoints = activeTaskDetails.reduce((sum, task) => {
		const from = task.showFromDay ?? 1;
		const until = task.showUntilDay ?? 91;
		const daysVisible = Math.max(0, Math.min(currentDayIndex, until) - from + 1);
		return sum + task.points * daysVisible;
	}, 0);
	const checkInPossiblePoints = Math.max(0, currentMonth - 1) * POINTS.MONTHLY_CHECKIN;
	const totalPossiblePoints = taskPossiblePoints + checkInPossiblePoints;

	const achievedPercent =
		totalPossiblePoints > 0
			? Math.min(100, Math.round((totalPoints / totalPossiblePoints) * 100))
			: 0;

	// Seuils conformes au cahier des charges client
	const statuts = [
		{ minPercent: 100, num: 6, name: 'Titan Légendaire',    next: null,                  nextMin: null },
		{ minPercent: 98,  num: 5, name: 'Héro Millénium',      next: 'Titan Légendaire',    nextMin: 100  },
		{ minPercent: 94,  num: 4, name: 'Guerrier en devenir', next: 'Héro Millénium',      nextMin: 98   },
		{ minPercent: 90,  num: 3, name: 'Bambou Furieux',      next: 'Guerrier en devenir', nextMin: 94   },
		{ minPercent: 86,  num: 2, name: 'Éponge molle',        next: 'Bambou Furieux',      nextMin: 90   },
		{ minPercent: 0,   num: 1, name: 'Gland de chêne',      next: 'Éponge molle',        nextMin: 86   },
	];

	const levelData = statuts.find((s) => achievedPercent >= s.minPercent) ?? statuts[statuts.length - 1];
	const levelPercent =
		levelData.next != null && levelData.nextMin != null
			? Math.min(100, Math.round(((achievedPercent - levelData.minPercent) / (levelData.nextMin - levelData.minPercent)) * 100))
			: 100;

	return {
		currentDayIndex,
		currentWeek,
		totalPoints,
		totalPossiblePoints,
		achievedPercent,
		workoutCount,
		scorePercent,
		levelData,
		levelPercent,
		userBadges: userBadges.map((ub) => ({
			id: ub.id,
			name: ub.badge.name,
			description: ub.badge.description,
			awardedAt: ub.unlockedAt ? ub.unlockedAt.toISOString() : null,
			iconUrl: ub.badge.iconUrl ?? null,
		})),
		photoMap,
		inscriptionPhotoMap,
		/** Barème affiché : montants réels attribués par `awardPoints`. */
		points: POINTS,
		currentMonth,
		/** Mois affiché, relatif au cycle (1..3). */
		displayMonth: currentMonth - (Math.max(1, cycle.cycle) - 1) * 3,
		programCycle: cycle.cycle,
		monthlyCheckIns,
		checkInDue,
		currentMonthCheckIn,
	};
};

export const actions: Actions = {
	submitMonthlyCheckIn: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();

		// Valider les champs obligatoires (6 métriques)
		const schema = z.object({
			stressLevel: z.coerce.number().int().min(1).max(10),
			sleepQuality: z.coerce.number().int().min(1).max(10),
			bodyConfidence: z.coerce.number().int().min(1).max(10),
			digestionQuality: z.coerce.number().int().min(1).max(10),
			happinessLevel: z.coerce.number().int().min(1).max(10),
			readinessToChange: z.coerce.number().int().min(1).max(10).optional(),
			// Photos optionnelles
			frontUrl: z.string().startsWith('/api/cloudflare/r2/image/photos/').optional().or(z.literal('')),
			sideUrl: z.string().startsWith('/api/cloudflare/r2/image/photos/').optional().or(z.literal('')),
			backUrl: z.string().startsWith('/api/cloudflare/r2/image/photos/').optional().or(z.literal(''))
		});

		const parsed = schema.safeParse({
			stressLevel: formData.get('stressLevel'),
			sleepQuality: formData.get('sleepQuality'),
			bodyConfidence: formData.get('bodyConfidence'),
			digestionQuality: formData.get('digestionQuality'),
			happinessLevel: formData.get('happinessLevel'),
			readinessToChange: formData.get('readinessToChange'),
			frontUrl: formData.get('frontUrl') || '',
			sideUrl: formData.get('sideUrl') || '',
			backUrl: formData.get('backUrl') || ''
		});

		if (!parsed.success) {
			return fail(400, { message: 'Données invalides' });
		}

		const { stressLevel, sleepQuality, bodyConfidence, digestionQuality, happinessLevel, readinessToChange, frontUrl, sideUrl, backUrl } = parsed.data;

		try {
			const cycle = await getUserProgramCycle(locals.user.id);
			if (cycle.cycle === 0) {
				return fail(400, { message: 'Programme non démarré' });
			}

			const currentDayIndex = cycle.dayIndex;
			if (currentDayIndex < 1) {
				return fail(400, { message: 'Programme pas encore démarré' });
			}
			const currentMonth = absoluteProgressMonth(cycle, currentDayIndex);

			// Vérifier qu'un check-in n'existe pas pour ce mois
			const existing = await prisma.monthlyCheckIn.findUnique({
				where: { userId_month: { userId: locals.user.id, month: currentMonth } }
			});

			if (existing) {
				return fail(409, { message: 'Check-in déjà soumis pour ce mois' });
			}

			// Créer le check-in mensuel
			await prisma.monthlyCheckIn.create({
				data: {
					userId: locals.user.id,
					month: currentMonth,
					stressLevel,
					sleepQuality,
					bodyConfidence,
					digestionQuality,
					happinessLevel,
					readinessToChange: readinessToChange || null,
					submittedAt: new Date()
				}
			});

			// Créer les photos optionnelles
			if (frontUrl) {
				await prisma.progressPhoto.create({
					data: {
						userId: locals.user.id,
						angle: 'FRONT',
						url: frontUrl,
						month: currentMonth
					}
				});
			}
			if (sideUrl) {
				await prisma.progressPhoto.create({
					data: {
						userId: locals.user.id,
						angle: 'SIDE',
						url: sideUrl,
						month: currentMonth
					}
				});
			}
			if (backUrl) {
				await prisma.progressPhoto.create({
					data: {
						userId: locals.user.id,
						angle: 'BACK',
						url: backUrl,
						month: currentMonth
					}
				});
			}

			// Créer l'événement de points
			await awardPoints({
				userId: locals.user.id,
				type: 'MONTHLY_CHECKIN',
				metadata: { source: 'monthly-checkin', month: currentMonth }
			});

			return { success: true, message: `Check-in soumis et +${POINTS.MONTHLY_CHECKIN} points gagnés !` };
		} catch (error: unknown) {
			console.error('Error submitting monthly check-in:', error);
			return fail(500, { message: 'Erreur lors de la soumission du check-in' });
		}
	}
};
