import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server';
import { serializeData } from '$lib/utils/serializeData';

export type ProgramDaySummary = {
	dayIndex: number;
	sport: { session: { name: string }; completedAt?: string | null } | null;
	nutrition: { meals: Array<{ position: string; recipe: { name: string } | null }> };
};

export type ProgramSummaryResponse = {
	days: ProgramDaySummary[];
};

/** GET : retourne les jours programme (sport + nutrition) pour l'utilisateur (JSON). */
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const userId = params.id;

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			nutritionDaysAllocated: true,
			workoutDays: {
				orderBy: { dayIndex: 'asc' },
				take: 400,
				include: { session: { select: { name: true } } }
			},
			nutritionDays: {
				orderBy: { dayIndex: 'asc' },
				take: 400,
				include: {
					meals: {
						include: { recipe: { select: { name: true } } }
					}
				}
			}
		}
	});

	if (!user) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	const raw = serializeData(user);
	const workoutDays = (raw.workoutDays ?? []) as Array<{
		dayIndex: number;
		completedAt?: string | Date | null;
		session?: { name: string } | null;
	}>;
	const nutritionDays = (raw.nutritionDays ?? []) as Array<{
		dayIndex: number;
		meals?: Array<{ position?: string; recipe?: { name?: string } | null }>;
	}>;

	const workoutByDay = new Map<number, (typeof workoutDays)[0]>();
	for (const w of workoutDays) {
		workoutByDay.set(w.dayIndex, w);
	}
	const nutritionByDay = new Map<number, (typeof nutritionDays)[0]>();
	for (const n of nutritionDays) {
		nutritionByDay.set(n.dayIndex, n);
	}

	const alloc = user.nutritionDaysAllocated ?? 0;
	const maxN = nutritionDays.reduce((m, n) => Math.max(m, n.dayIndex), 0);
	const maxW = workoutDays.reduce((m, w) => Math.max(m, w.dayIndex), 0);
	const totalDays = Math.min(Math.max(Math.max(alloc, maxN, maxW, 91), 1), 400);

	const days: ProgramDaySummary[] = [];
	for (let dayIndex = 1; dayIndex <= totalDays; dayIndex++) {
		const w = workoutByDay.get(dayIndex);
		const nd = nutritionByDay.get(dayIndex);
		const meals = (nd?.meals ?? []).map((m) => ({
			position: m.position ?? '',
			recipe: m.recipe ? { name: (m.recipe as { name?: string }).name ?? '' } : null
		}));
		const completedAt = w?.completedAt;
		const completedAtStr =
			completedAt instanceof Date ? completedAt.toISOString() : typeof completedAt === 'string' ? completedAt : null;
		days.push({
			dayIndex,
			sport: w?.session?.name
				? { session: { name: w.session.name }, completedAt: completedAtStr ?? null }
				: null,
			nutrition: { meals }
		});
	}

	return json({ days } satisfies ProgramSummaryResponse, {
		headers: {
			'Content-Disposition': `attachment; filename="programme-${userId}-${totalDays}j.json"`
		}
	});
};
