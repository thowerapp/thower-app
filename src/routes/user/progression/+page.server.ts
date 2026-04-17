// src/routes/user/progression/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server';

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
	};
};
