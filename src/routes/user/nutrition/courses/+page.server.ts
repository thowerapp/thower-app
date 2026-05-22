import { fail, redirect } from '@sveltejs/kit';
import { toggleShoppingItemChecked } from '$lib/prisma/shoppingList/toggleItemChecked';
import { generateShoppingListFromPlanning } from '$lib/prisma/shoppingList/generateFromPlanning';
import { parseShoppingItemSources, type ShoppingListWithItems } from '$lib/prisma/shoppingList/types';
import { requireNutritionAccess } from '$lib/server/programAccessGuard';
import { prisma } from '$lib/server';
import {
	currentProgramDayIndex,
	programWeekBounds,
	TOTAL_PROGRAM_DAYS
} from '$lib/utils/programDay';
import type { PageServerLoad, Actions } from './$types';

type SortOrder = 'category' | 'alpha';

function parseSortOrder(raw: string | null | undefined): SortOrder {
	return raw === 'alpha' ? 'alpha' : 'category';
}

export type Periode = 'jour' | '3jours' | 'semaine';
const VALID_PERIODES: Periode[] = ['jour', '3jours', 'semaine'];

function parseDaysCount(raw: string | null | undefined): number | null {
	if (!raw) return null;
	const parsed = Number.parseInt(raw, 10);
	if (!Number.isInteger(parsed)) return null;
	if (parsed < 1) return null;
	return Math.min(TOTAL_PROGRAM_DAYS, parsed);
}

function daysCountFromPeriode(currentDay: number, periode: Periode): number {
	if (periode === 'jour') return 1;
	if (periode === '3jours') return 3;
	const { weekEnd } = programWeekBounds(currentDay);
	return Math.max(1, weekEnd - currentDay + 1);
}

function computeRange(
	currentDay: number,
	daysCount: number
): { startDayIndex: number; endDayIndex: number } {
	const start = currentDay;
	const safeDays = Math.max(1, Math.min(TOTAL_PROGRAM_DAYS, daysCount));
	const end = Math.min(TOTAL_PROGRAM_DAYS, start + safeDays - 1);
	return { startDayIndex: start, endDayIndex: end };
}

function mapStoredList(row: {
	id: string;
	startDayIndex: number;
	endDayIndex: number;
	generatedAt: Date;
	items: Array<{
		id: string;
		ingredientName: string;
		category: string | null;
		totalQuantityG: number;
		unit: string | null;
		isChecked: boolean;
		isReported: boolean;
		sources?: unknown;
	}>;
}): ShoppingListWithItems {
	return {
		id: row.id,
		startDayIndex: row.startDayIndex,
		endDayIndex: row.endDayIndex,
		generatedAt: row.generatedAt,
		items: row.items.map((item) => ({
			id: item.id,
			ingredientName: item.ingredientName,
			category: item.category,
			totalQuantityG: item.totalQuantityG,
			unit: item.unit,
			isChecked: item.isChecked,
			isReported: item.isReported,
			sources: parseShoppingItemSources(item.sources)
		}))
	};
}

async function getOrGenerateList(
	userId: string,
	startDayIndex: number,
	endDayIndex: number
): Promise<ShoppingListWithItems | null> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const db = prisma as any;
	if (!db.shoppingList) return null;

	const existing = await db.shoppingList.findFirst({
		where: { userId, startDayIndex, endDayIndex },
		orderBy: { generatedAt: 'desc' },
		select: {
			id: true,
			startDayIndex: true,
			endDayIndex: true,
			generatedAt: true,
			items: {
				select: {
					id: true,
					ingredientName: true,
					category: true,
					totalQuantityG: true,
					unit: true,
					isChecked: true,
					isReported: true,
					sources: true
				}
			}
		}
	});

	if (existing) {
		const mapped = mapStoredList(existing);
		const needsRefresh =
			mapped.items.length > 0 && mapped.items.every((item) => item.sources.length === 0);
		if (!needsRefresh) return mapped;
	}

	const result = await generateShoppingListFromPlanning(userId, startDayIndex, endDayIndex, {
		includeReportedFromPrevious: true
	});
	return result?.list ?? null;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) return redirect(302, '/auth/login');
	const userId = locals.user.id;

	const rawPeriode = url.searchParams.get('periode') ?? 'semaine';
	const periode: Periode = VALID_PERIODES.includes(rawPeriode as Periode)
		? (rawPeriode as Periode)
		: 'semaine';
	const rawDays = url.searchParams.get('days');
	const sortOrder = parseSortOrder(url.searchParams.get('sort'));

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { programStartDate: true, nutritionDaysAllocated: true }
	});

	const currentDay = currentProgramDayIndex(user?.programStartDate ?? null);
	const daysCount = parseDaysCount(rawDays) ?? daysCountFromPeriode(currentDay, periode);
	const { startDayIndex, endDayIndex } = computeRange(currentDay, daysCount);

	const list = await getOrGenerateList(userId, startDayIndex, endDayIndex);

	return { list, periode, currentDay, startDayIndex, endDayIndex, daysCount, sortOrder };
};

export const actions: Actions = {
	toggleItem: async ({ request, locals }) => {
		if (!locals.user) return fail(401);
		await requireNutritionAccess(locals.user.id, locals.user.role);
		const data = await request.formData();
		const itemId = data.get('itemId');
		const isChecked = data.get('isChecked') === 'true';
		if (typeof itemId !== 'string' || !itemId) return fail(400, { message: 'itemId manquant' });
		await toggleShoppingItemChecked(itemId, isChecked);
		return { success: true };
	},

	regenerate: async ({ request, locals }) => {
		if (!locals.user) return fail(401);
		await requireNutritionAccess(locals.user.id, locals.user.role);
		const userId = locals.user.id;
		const fd = await request.formData();
		const rawPeriode = fd.get('periode') ?? 'semaine';
		const periode: Periode = VALID_PERIODES.includes(rawPeriode as Periode)
			? (rawPeriode as Periode)
			: 'semaine';
		const rawDays = fd.get('days');

		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { programStartDate: true, nutritionDaysAllocated: true }
		});
		if ((user?.nutritionDaysAllocated ?? 0) < 1)
			return fail(400, { message: 'Aucun jour de programme alloué.' });

		const currentDay = currentProgramDayIndex(user?.programStartDate ?? null);
		const daysCount =
			typeof rawDays === 'string'
				? (parseDaysCount(rawDays) ?? daysCountFromPeriode(currentDay, periode))
				: daysCountFromPeriode(currentDay, periode);
		const { startDayIndex, endDayIndex } = computeRange(currentDay, daysCount);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const db = prisma as any;
		if (db.shoppingList) {
			await db.shoppingList.deleteMany({ where: { userId, startDayIndex, endDayIndex } });
		}

		const result = await generateShoppingListFromPlanning(userId, startDayIndex, endDayIndex, {
			includeReportedFromPrevious: true
		});
		if (!result) return fail(500, { message: 'Erreur lors de la génération de la liste.' });
		return { success: true };
	}
};
