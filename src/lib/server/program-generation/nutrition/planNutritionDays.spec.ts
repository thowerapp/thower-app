import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server', () => ({ prisma: {} }));

import { RECIPE_CATALOG_DEFS } from '$lib/server/seed/recipeCatalogDefs.js';
import { dailyMealTargets } from '$lib/nutrition/nutritionTargets';
import {
	planNutritionDays,
	type CatalogRecipe,
	type ExistingNutritionDay
} from './planNutritionDays';

const CATALOG = (RECIPE_CATALOG_DEFS as unknown as Omit<CatalogRecipe, 'id'>[]).map((r, i) => ({
	...r,
	id: `r${i}`
})) as CatalogRecipe[];
const pools = {
	BREAKFAST: CATALOG.filter((r) => r.category === 'BREAKFAST'),
	MEAL: CATALOG.filter((r) => r.category === 'MEAL')
};
const mealTargets = dailyMealTargets({
	weightKg: 80,
	bodyFatPercent: 20,
	activityLevel: 'ACTIVE'
})!;
const POSITIONS = ['LUNCH', 'DINNER'] as const;

const base = {
	userId: 'user-1',
	targetDays: 91,
	positions: [...POSITIONS],
	intermittentFastingDefault: false,
	mealTargets,
	pools
};

function existingMeal(over: Record<string, unknown>) {
	return {
		id: 'm',
		position: 'LUNCH',
		recipeId: pools.MEAL[0].id,
		recipe: pools.MEAL[0],
		isManual: false,
		eatenAt: null,
		manualProteinG: null,
		manualCarbsG: null,
		manualFatG: null,
		manualFiberG: null,
		calcProteinG: 30,
		calcCarbsG: 50,
		calcFatG: 15,
		calcFiberG: 6,
		...over
	};
}

const day = (dayIndex: number, meals: unknown[]) =>
	({
		id: `d${dayIndex}`,
		dayIndex,
		intermittentFasting: false,
		meals
	}) as unknown as ExistingNutritionDay;

describe('planNutritionDays', { timeout: 30_000 }, () => {
	it('planifie 91 jours neufs : un jour et un repas par cr\u00e9neau, sans mise \u00e0 jour', () => {
		const plan = planNutritionDays({ ...base, existingDays: [] });
		expect(plan.daysToCreate).toHaveLength(91);
		expect(plan.mealCreates).toHaveLength(91 * 2);
		expect(plan.mealUpdates).toHaveLength(0);
		const keys = plan.mealCreates.map((m) => `${m.dayIndex}:${m.position}`);
		expect(new Set(keys).size).toBe(keys.length);
		expect(plan.mealCreates.every((m) => m.portion.quantityG > 0)).toBe(true);
	});

	it('est d\u00e9terministe pour un m\u00eame utilisateur', () => {
		const a = planNutritionDays({ ...base, existingDays: [] });
		const b = planNutritionDays({ ...base, existingDays: [] });
		expect(JSON.stringify(a)).toBe(JSON.stringify(b));
	});

	it('varie les plats : pas deux repas identiques le m\u00eame jour ni sur trois jours cons\u00e9cutifs', () => {
		const plan = planNutritionDays({ ...base, existingDays: [] });
		const byDay = new Map<number, string[]>();
		for (const m of plan.mealCreates)
			byDay.set(m.dayIndex, [...(byDay.get(m.dayIndex) ?? []), m.recipeId]);
		for (const [d, ids] of byDay) {
			expect(new Set(ids).size).toBe(ids.length);
			const previous = [d - 1, d - 2, d - 3].flatMap((p) => byDay.get(p) ?? []);
			expect(ids.some((id) => previous.includes(id))).toBe(false);
		}
	});

	it('inclut le petit-d\u00e9jeuner quand le cr\u00e9neau est demand\u00e9', () => {
		const plan = planNutritionDays({
			...base,
			targetDays: 10,
			positions: ['BREAKFAST', 'LUNCH', 'DINNER'],
			existingDays: []
		});
		expect(plan.mealCreates).toHaveLength(30);
		expect(plan.mealCreates.filter((m) => m.position === 'BREAKFAST')).toHaveLength(10);
	});

	it('ne touche pas aux jours complets et compl\u00e8te les jours partiels', () => {
		const complete = day(1, [
			existingMeal({ id: 'a', position: 'LUNCH' }),
			existingMeal({
				id: 'b',
				position: 'DINNER',
				recipeId: pools.MEAL[1].id,
				recipe: pools.MEAL[1]
			})
		]);
		const partial = day(2, [
			existingMeal({
				id: 'c',
				position: 'LUNCH',
				recipeId: pools.MEAL[2].id,
				recipe: pools.MEAL[2]
			})
		]);
		const plan = planNutritionDays({ ...base, targetDays: 3, existingDays: [complete, partial] });

		expect(plan.daysToCreate.map((d) => d.dayIndex)).toEqual([3]);
		expect(plan.mealUpdates.map((u) => u.mealId)).toEqual(['c']);
		expect(plan.mealCreates.filter((m) => m.dayIndex === 1)).toHaveLength(0);
		expect(plan.mealCreates.filter((m) => m.dayIndex === 2).map((m) => m.position)).toEqual([
			'DINNER'
		]);
		expect(plan.mealCreates.filter((m) => m.dayIndex === 3)).toHaveLength(2);
	});

	it('conserve un repas d\u00e9j\u00e0 mang\u00e9 sans le recalculer', () => {
		const eaten = existingMeal({ id: 'eaten', position: 'LUNCH', eatenAt: new Date() });
		const plan = planNutritionDays({ ...base, targetDays: 1, existingDays: [day(1, [eaten])] });
		expect(plan.mealUpdates).toHaveLength(0);
		expect(plan.mealCreates.map((m) => m.position)).toEqual(['DINNER']);
	});

	it('reste g\u00e9n\u00e9rable sans cibles (profil incomplet)', () => {
		const plan = planNutritionDays({ ...base, targetDays: 5, mealTargets: null, existingDays: [] });
		expect(plan.mealCreates).toHaveLength(10);
	});
});
