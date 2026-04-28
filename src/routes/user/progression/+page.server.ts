// src/routes/user/progression/+page.server.ts
import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server';
import { z } from 'zod';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/auth/login');

	const userId = locals.user.id;

	function startOfUtcDay(d: Date = new Date()): Date {
		const r = new Date(d);
		r.setUTCHours(0, 0, 0, 0);
		return r;
	}

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { programStartDate: true }
	});

	let currentDayIndex = 1;
	let currentWeek = 1;
	const programStart = user?.programStartDate;
	if (programStart) {
		const diff = Math.floor(
			(startOfUtcDay().getTime() - startOfUtcDay(programStart).getTime()) / 86_400_000
		);
		currentDayIndex = Math.min(Math.max(diff + 1, 1), 91);
		currentWeek = Math.ceil(currentDayIndex / 7);
	}

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

	// ─── Score global (% tâches validées / tâches actives attendues) ─────────
	const [activeTasks, completions] = await Promise.all([
		prisma.dailyTask.count({ where: { active: true } }),
		prisma.dailyTaskCompletion.count({ where: { userId } })
	]);
	const expectedCompletions = activeTasks * currentDayIndex;
	const scorePercent =
		expectedCompletions > 0 ? Math.round((completions / expectedCompletions) * 100) : 0;

	// ─── Photos du mois ──────────────────────────────────────────────────────
	const currentMonth = Math.ceil(currentDayIndex / 30);
	const photosByAngle = await prisma.progressPhoto.findMany({
		where: { userId, month: currentMonth },
		select: { angle: true, url: true }
	});
	const photoMap: Record<string, string | null> = {
		FRONT: null,
		SIDE: null,
		BACK: null
	};
	for (const p of photosByAngle) {
		photoMap[p.angle] = p.url;
	}

	// ─── Check-in mensuel ────────────────────────────────────────────────────
	const monthlyCheckIns = await prisma.monthlyCheckIn.findMany({
		where: { userId },
		orderBy: { month: 'asc' }
	});
	const currentMonthCheckIn = monthlyCheckIns.find((c) => c.month === currentMonth);
	const checkInDue = currentMonth >= 1 && !currentMonthCheckIn;

	// ─── Niveau Thower — calculé depuis les points ────────────────────────────
	// Paliers : 0–199=1, 200–499=2, 500–999=3, 1000–1999=4, 2000+=5
	const levels = [
		{ min: 0,    max: 199,  num: 1, name: 'Bambou en herbe', next: 'Bambou Furieux',     nextMin: 200  },
		{ min: 200,  max: 499,  num: 2, name: 'Bambou Furieux',  next: 'Guerrier en devenir', nextMin: 500  },
		{ min: 500,  max: 999,  num: 3, name: 'Guerrier en devenir', next: 'Guerrier Thower', nextMin: 1000 },
		{ min: 1000, max: 1999, num: 4, name: 'Guerrier Thower', next: 'Maître Thower',       nextMin: 2000 },
		{ min: 2000, max: Infinity, num: 5, name: 'Maître Thower', next: null, nextMin: null },
	];

	const levelData = levels.find((l) => totalPoints >= l.min && totalPoints <= l.max) ?? levels[0];
	const levelPercent =
		levelData.nextMin != null
			? Math.round(((totalPoints - levelData.min) / (levelData.nextMin - levelData.min)) * 100)
			: 100;

	return {
		currentDayIndex,
		currentWeek,
		totalPoints,
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
		currentMonth,
		monthlyCheckIns,
		checkInDue,
		currentMonthCheckIn
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
			frontUrl: z.string().url().optional().or(z.literal('')),
			sideUrl: z.string().url().optional().or(z.literal('')),
			backUrl: z.string().url().optional().or(z.literal(''))
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

			// Calculer le mois actuel
			function startOfUtcDay(d: Date = new Date()): Date {
				const r = new Date(d);
				r.setUTCHours(0, 0, 0, 0);
				return r;
			}
			const diff = Math.floor(
				(startOfUtcDay().getTime() - startOfUtcDay(user.programStartDate).getTime()) / 86_400_000
			);
			const currentDayIndex = Math.min(Math.max(diff + 1, 1), 91);
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

			// Créer l'événement de points (+100)
			await prisma.pointEvent.create({
				data: {
					userId: locals.user.id,
					type: 'MONTHLY_CHECKIN',
					amount: 100,
					description: `Check-in du mois ${currentMonth}`
				}
			});

			return { success: true, message: 'Check-in soumis et +100 points gagnés !' };
		} catch (error: unknown) {
			console.error('Error submitting monthly check-in:', error);
			return fail(500, { message: 'Erreur lors de la soumission du check-in' });
		}
	}
};
