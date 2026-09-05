// src/routes/user/progression/+page.server.ts
import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server';
import { z } from 'zod';
import { currentProgramDayIndex } from '$lib/utils/programDay';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/auth/login');

	const userId = locals.user.id;

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { programStartDate: true }
	});

	const programStart = user?.programStartDate ?? null;
	const currentDayIndex = currentProgramDayIndex(programStart);
	const currentWeek = currentDayIndex > 0 ? Math.ceil(currentDayIndex / 7) : 1;

	// ─── Points totaux ───────────────────────────────────────────────────────
	const pointEvents = await prisma.pointEvent.findMany({
		where: { userId },
		select: { amount: true }
	});
	const totalPoints = pointEvents.reduce((s, e) => s + e.amount, 0);

	// ─── Séances validées ────────────────────────────────────────────────────
	const workoutCount = await prisma.userWorkoutDay.count({
		where: { userId, completedAt: { not: null } }
	});

	// ─── Badges ─────────────────────────────────────────────────────────────
	const userBadges = await prisma.userBadge.findMany({
		where: { userId },
		include: { badge: true },
		orderBy: { unlockedAt: 'desc' }
	});

	// ─── Score du jour (% tâches validées aujourd'hui / tâches actives) ────────
	const todayStartProg = new Date();
	todayStartProg.setUTCHours(0, 0, 0, 0);
	const [activeTaskDetails, todayCompletions] = await Promise.all([
		prisma.dailyTask.findMany({
			where: { active: true },
			select: { points: true, showFromDay: true, showUntilDay: true }
		}),
		prisma.dailyTaskCompletion.count({ where: { userId, date: todayStartProg } })
	]);
	const activeTasks = activeTaskDetails.length;
	const scorePercent =
		activeTasks > 0 ? Math.min(100, Math.round((todayCompletions / activeTasks) * 100)) : 0;

	// ─── Photos du mois + photos d'inscription ──────────────────────────────
	const currentMonth = Math.ceil(currentDayIndex / 30);
	const [photosByAngle, inscriptionPhotosByAngle] = await Promise.all([
		prisma.progressPhoto.findMany({
			where: { userId, month: currentMonth },
			select: { angle: true, url: true }
		}),
		prisma.progressPhoto.findMany({
			where: { userId, month: 0 },
			select: { angle: true, url: true }
		})
	]);
	const photoMap: Record<string, string | null> = { FRONT: null, SIDE: null, BACK: null };
	for (const p of photosByAngle) photoMap[p.angle] = p.url;

	const inscriptionPhotoMap: Record<string, string | null> = { FRONT: null, SIDE: null, BACK: null };
	for (const p of inscriptionPhotosByAngle) inscriptionPhotoMap[p.angle] = p.url;

	// ─── Check-in mensuel ────────────────────────────────────────────────────
	const monthlyCheckIns = await prisma.monthlyCheckIn.findMany({
		where: { userId },
		orderBy: { month: 'asc' }
	});
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
	const checkInPossiblePoints = Math.max(0, currentMonth - 1) * 50;
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
		currentMonth,
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
			const user = await prisma.user.findUnique({
				where: { id: locals.user.id },
				select: { programStartDate: true }
			});

			if (!user?.programStartDate) {
				return fail(400, { message: 'Programme non démarré' });
			}

			const currentDayIndex = currentProgramDayIndex(user.programStartDate);
			if (currentDayIndex < 1) {
				return fail(400, { message: 'Programme pas encore démarré' });
			}
			const currentMonth = Math.ceil(currentDayIndex / 30);

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

			// Créer l'événement de points (+50)
			await prisma.pointEvent.create({
				data: {
					userId: locals.user.id,
					type: 'MONTHLY_CHECKIN',
					amount: 50,
					metadata: { source: 'monthly-checkin', month: currentMonth }
				}
			});

			return { success: true, message: 'Check-in soumis et +50 points gagnés !' };
		} catch (error: unknown) {
			console.error('Error submitting monthly check-in:', error);
			return fail(500, { message: 'Erreur lors de la soumission du check-in' });
		}
	}
};
