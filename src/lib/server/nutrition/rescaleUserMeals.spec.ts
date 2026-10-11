import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
	user: { findUnique: vi.fn(), update: vi.fn() },
	userProfile: { findUnique: vi.fn() },
	bodyMeasurement: { findFirst: vi.fn() },
	nutritionDay: { findMany: vi.fn() },
	shoppingList: { findMany: vi.fn(async (_args?: unknown) => [] as unknown[]) },
	meal: { update: vi.fn((args: unknown) => args) },
	$transaction: vi.fn(async (ops: unknown[]) => ops)
}));
vi.mock('$lib/server', () => ({ prisma: prismaMock }));

import { RECIPE_CATALOG_DEFS } from '$lib/server/seed/recipeCatalogDefs.js';
import { dailyMealTargets } from '$lib/nutrition/nutritionTargets';
import {
	planNutritionDays,
	type CatalogRecipe
} from '$lib/server/program-generation/nutrition/planNutritionDays';
import { rescaleUserMeals, targetsKey } from './rescaleUserMeals';

const CATALOG = (RECIPE_CATALOG_DEFS as unknown as Omit<CatalogRecipe, 'id'>[]).map((r, i) => ({
	...r,
	id: `r${i}`
})) as CatalogRecipe[];
const pools = {
	BREAKFAST: CATALOG.filter((r) => r.category === 'BREAKFAST'),
	MEAL: CATALOG.filter((r) => r.category === 'MEAL')
};
const recipeById = new Map(CATALOG.map((r) => [r.id, r]));

const targets80 = dailyMealTargets({ weightKg: 80, bodyFatPercent: 20, activityLevel: 'ACTIVE' })!;

/** Cadencier de 10 jours tel que la génération l'écrit pour `targets80`. */
function generatedDays() {
	const plan = planNutritionDays({
		userId: 'u1',
		targetDays: 10,
		existingDays: [],
		positions: ['LUNCH', 'DINNER'],
		intermittentFastingDefault: false,
		mealTargets: targets80,
		pools
	});
	return Array.from({ length: 10 }, (_, i) => ({
		id: `d${i + 1}`,
		dayIndex: i + 1,
		intermittentFasting: false,
		meals: plan.mealCreates
			.filter((m) => m.dayIndex === i + 1)
			.map((m) => ({
				id: `m${i + 1}-${m.position}`,
				position: m.position,
				recipeId: m.recipeId,
				recipe: recipeById.get(m.recipeId),
				isManual: false,
				eatenAt: null,
				manualProteinG: null,
				manualCarbsG: null,
				manualFatG: null,
				manualFiberG: null,
				...m.portion
			}))
	}));
}

function profileFor(weightKg: number) {
	prismaMock.userProfile.findUnique.mockResolvedValue({
		bodyFatPercent: 20,
		activityLevel: 'ACTIVE',
		breadDaily: false,
		breadGramsPerDay: null,
		breadType: null
	});
	prismaMock.bodyMeasurement.findFirst.mockResolvedValue({ weightKg });
}

beforeEach(() => {
	vi.clearAllMocks();
	prismaMock.$transaction.mockImplementation(async (ops: unknown[]) => ops);
	prismaMock.meal.update.mockImplementation((args: unknown) => args);
	prismaMock.nutritionDay.findMany.mockResolvedValue(generatedDays());
});

describe('rescaleUserMeals', { timeout: 30_000 }, () => {
	it('ne fait rien quand les cibles sont d\u00e9j\u00e0 appliqu\u00e9es', async () => {
		profileFor(80);
		prismaMock.user.findUnique.mockResolvedValue({ nutritionTargetsKey: targetsKey(targets80) });
		await rescaleUserMeals('u1');
		expect(prismaMock.nutritionDay.findMany).not.toHaveBeenCalled();
		expect(prismaMock.user.update).not.toHaveBeenCalled();
	});

	it('recalcule malgr\u00e9 une empreinte identique avec force', async () => {
		profileFor(80);
		prismaMock.user.findUnique.mockResolvedValue({ nutritionTargetsKey: targetsKey(targets80) });
		await rescaleUserMeals('u1', { force: true });
		expect(prismaMock.nutritionDay.findMany).toHaveBeenCalledTimes(1);
	});

	it('n\u2019\u00e9crit aucun repas d\u00e9j\u00e0 \u00e0 jour et m\u00e9morise l\u2019empreinte', async () => {
		profileFor(80);
		prismaMock.user.findUnique.mockResolvedValue({ nutritionTargetsKey: null });
		await rescaleUserMeals('u1');
		expect(prismaMock.meal.update).not.toHaveBeenCalled();
		expect(prismaMock.user.update.mock.calls[0][0].data.nutritionTargetsKey).toBe(
			targetsKey(targets80)
		);
	});

	it('r\u00e9\u00e9crit les repas quand le poids change', async () => {
		profileFor(70);
		prismaMock.user.findUnique.mockResolvedValue({ nutritionTargetsKey: targetsKey(targets80) });
		await rescaleUserMeals('u1');
		expect(prismaMock.meal.update.mock.calls.length).toBeGreaterThan(0);
		expect(prismaMock.user.update.mock.calls[0][0].data.nutritionTargetsKey).not.toBe(
			targetsKey(targets80)
		);
	});

	it('régénère les listes de courses des jours modifiés, sauf si demandé autrement', async () => {
		profileFor(70);
		prismaMock.user.findUnique.mockResolvedValue({ nutritionTargetsKey: null });
		await rescaleUserMeals('u1');
		const args = prismaMock.shoppingList.findMany.mock.calls[0][0] as { where: { OR: unknown[] } };
		const where = args.where;
		expect(where.OR.length).toBe(10);

		prismaMock.shoppingList.findMany.mockClear();
		await rescaleUserMeals('u1', { regenerateLists: false });
		expect(prismaMock.shoppingList.findMany).not.toHaveBeenCalled();
	});

	it('ne touche pas aux listes quand aucun repas n’a changé', async () => {
		profileFor(80);
		prismaMock.user.findUnique.mockResolvedValue({ nutritionTargetsKey: null });
		await rescaleUserMeals('u1');
		expect(prismaMock.shoppingList.findMany).not.toHaveBeenCalled();
	});

	it('regroupe les mises \u00e0 jour en transactions born\u00e9es', async () => {
		profileFor(70);
		prismaMock.user.findUnique.mockResolvedValue({ nutritionTargetsKey: null });
		prismaMock.nutritionDay.findMany.mockResolvedValue(
			Array.from({ length: 10 }, () => generatedDays())
				.flat()
				.map((d, i) => ({ ...d, id: `x${i}`, dayIndex: i + 1 }))
		);
		await rescaleUserMeals('u1');
		for (const [ops] of prismaMock.$transaction.mock.calls) {
			expect((ops as unknown[]).length).toBeLessThanOrEqual(60);
		}
	});
});
