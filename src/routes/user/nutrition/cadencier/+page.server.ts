import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server';
import type { MealPosition, Prisma } from '@prisma/client';
import {
	currentProgramDayIndex,
	TOTAL_PROGRAM_DAYS,
	TOTAL_PROGRAM_WEEKS
} from '$lib/utils/programDay';

const TOTAL_DAYS = TOTAL_PROGRAM_DAYS;
const WEEKS = TOTAL_PROGRAM_WEEKS;

function positionLabel(position: MealPosition): string {
	switch (position) {
		case 'BREAKFAST':
			return 'Petit-déjeuner';
		case 'LUNCH':
			return 'Déjeuner';
		case 'DINNER':
			return 'Dîner';
		default:
			return 'Repas';
	}
}

function positionOrder(position: MealPosition): number {
	switch (position) {
		case 'BREAKFAST':
			return 0;
		case 'LUNCH':
			return 1;
		case 'DINNER':
			return 2;
		default:
			return 3;
	}
}

function defaultTimeLabel(position: MealPosition): string {
	switch (position) {
		case 'BREAKFAST':
			return '08h00';
		case 'LUNCH':
			return '12h30';
		case 'DINNER':
			return '19h00';
		default:
			return '—';
	}
}

type CadencierMealDTO = {
	id: string;
	position: MealPosition;
	slotIndex: number;
	label: string;
	timeLabel: string;
	recipeName: string;
	calories: number;
	proteinG: number;
	carbsG: number;
	fatG: number;
	fiberG: number;
};

type CadencierDayDTO = {
	dayIndex: number;
	dayName: string;
	dayNumInWeek: number;
	isToday: boolean;
	hasPlan: boolean;
	meals: CadencierMealDTO[];
};

/** Ligne User attendue après findUnique (select ci-dessous). */
type CadencierUserRow = {
	programStartDate: Date | null;
	nutritionDaysAllocated: number;
	profile: { intermittentFastingMorning: boolean | null } | null;
};

/** Même motif que generateProgramForUser : UserSelect parfois désynchronisé côté types. */
const cadencierUserSelect = {
	programStartDate: true,
	nutritionDaysAllocated: true,
	profile: { select: { intermittentFastingMorning: true } }
} as unknown as Prisma.UserSelect;

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const userId = locals.user.id;

	const user = (await prisma.user.findUnique({
		where: { id: userId },
		select: cadencierUserSelect
	})) as CadencierUserRow | null;

	const currentDayIndex = currentProgramDayIndex(user?.programStartDate ?? null);
	const currentWeek = Math.min(WEEKS, Math.max(1, Math.ceil(currentDayIndex / 7)));

	const rawSemaine = url.searchParams.get('semaine');
	let selectedWeek =
		rawSemaine != null && rawSemaine !== '' ? Number.parseInt(rawSemaine, 10) : NaN;
	if (!Number.isInteger(selectedWeek) || selectedWeek < 1 || selectedWeek > WEEKS) {
		selectedWeek = currentWeek;
	}
	if (rawSemaine !== String(selectedWeek)) {
		const next = new URL(url);
		next.searchParams.set('semaine', String(selectedWeek));
		throw redirect(302, next.pathname + next.search);
	}
	const weekStart = (selectedWeek - 1) * 7 + 1;
	const weekEnd = Math.min(TOTAL_DAYS, weekStart + 6);

	const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

	const rows = await prisma.nutritionDay.findMany({
		where: { userId, dayIndex: { gte: weekStart, lte: weekEnd } },
		orderBy: { dayIndex: 'asc' },
		include: {
			meals: {
				include: {
					recipe: { select: { id: true, name: true } }
				}
			}
		}
	});

	const byIndex = new Map(rows.map((d) => [d.dayIndex, d]));

	const weekDays: CadencierDayDTO[] = [];
	for (let dayIndex = weekStart; dayIndex <= weekEnd; dayIndex++) {
		const row = byIndex.get(dayIndex);
		const dow = (dayIndex - 1) % 7;
		const sortedMeals = row
			? [...row.meals].sort((a, b) => positionOrder(a.position) - positionOrder(b.position))
			: [];
		const meals: CadencierMealDTO[] = sortedMeals.map((m, slotIndex) => {
			const manual = m.isManual === true;
			const calories = Math.round(
				manual ? (m.manualCalories ?? 0) : (m.calcCalories ?? 0)
			);
			const proteinG = Math.round(
				(manual ? (m.manualProteinG ?? 0) : (m.calcProteinG ?? 0)) * 10
			) / 10;
			const carbsG = Math.round(
				(manual ? (m.manualCarbsG ?? 0) : (m.calcCarbsG ?? 0)) * 10
			) / 10;
			const fatG = Math.round(
				(manual ? (m.manualFatG ?? 0) : (m.calcFatG ?? 0)) * 10
			) / 10;
			const fiberG = Math.round(
				(manual ? (m.manualFiberG ?? 0) : (m.calcFiberG ?? 0)) * 10
			) / 10;
			return {
				id: m.id,
				position: m.position,
				slotIndex: slotIndex + 1,
				label: `Repas ${slotIndex + 1} — ${positionLabel(m.position)}`,
				timeLabel: defaultTimeLabel(m.position),
				recipeName: m.recipe?.name?.trim() ? m.recipe.name : 'Non planifié',
				calories,
				proteinG,
				carbsG,
				fatG,
				fiberG
			};
		});

		weekDays.push({
			dayIndex,
			dayName: dayNames[dow] ?? '—',
			dayNumInWeek: dow + 1,
			isToday: dayIndex === currentDayIndex,
			hasPlan: sortedMeals.length > 0,
			meals
		});
	}

	let defaultSelectedDay = currentDayIndex;
	if (defaultSelectedDay < weekStart || defaultSelectedDay > weekEnd) {
		defaultSelectedDay = weekStart;
	}

	return {
		currentDayIndex,
		currentWeek,
		selectedWeek,
		weekStart,
		weekEnd,
		weekDays,
		defaultSelectedDay,
		nutritionDaysAllocated: user?.nutritionDaysAllocated ?? 0,
		hasProgramStart: user?.programStartDate != null,
		intermittentFasting: user?.profile?.intermittentFastingMorning ?? false,
	};
};

export const actions: Actions = {
	toggleJeune: async ({ locals, request }) => {
		if (!locals.user) return fail(401, { error: 'Non authentifié' });
		const userId = locals.user.id;
		const data = await request.formData();
		const active = data.get('active') === 'true';
		try {
			await prisma.userProfile.upsert({
				where: { userId },
				create: { userId, intermittentFastingMorning: active },
				update: { intermittentFastingMorning: active },
			});
			return { success: true };
		} catch (e) {
			console.error('[cadencier toggleJeune]', e);
			return fail(500, { error: 'Erreur serveur' });
		}
	}
};
