import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '$lib/server';
import { createNutritionProfile, createPaidUser, seedRecipeCatalog } from '$lib/server/testing/integration/db';
import { invalidateRecipeCatalog } from './recipeCatalog';
import {
	backfillMissingBreakfastMeals,
	ensureBreakfastMealForDay,
	loadBreakfastBackfillContext,
	loadBreakfastBackfillContextFromProfile,
	type BreakfastProfileInput
} from './ensureBreakfastMeal';

const profile: BreakfastProfileInput = {
	allergens: [],
	otherAllergens: null,
	disgustingFoods: null,
	bodyFatPercent: 25,
	activityLevel: 'ACTIVE',
	breadDaily: false,
	breadGramsPerDay: null,
	breadType: null
};

/** Jour de cadencier sans petit-déjeuner (plans générés avant que le petit-déjeuner soit toujours créé). */
async function dayWithoutBreakfast(userId: string, dayIndex: number) {
	const meals = await prisma.recipe.findMany({ where: { category: 'MEAL' }, take: 2 });
	const day = await prisma.nutritionDay.create({ data: { userId, dayIndex } });
	await prisma.meal.createMany({
		data: [
			{ nutritionDayId: day.id, position: 'LUNCH', recipeId: meals[0].id, quantityG: 300, calcCalories: 600 },
			{ nutritionDayId: day.id, position: 'DINNER', recipeId: meals[1].id, quantityG: 300, calcCalories: 600 }
		]
	});
	return day;
}

const positionsOf = async (nutritionDayId: string) => (await prisma.meal.findMany({ where: { nutritionDayId } })).map((m) => m.position).sort();

beforeEach(() => invalidateRecipeCatalog());

describe('petit-déjeuner manquant (base réelle)', () => {
	it('charge le contexte : aucun profil ou aucune recette compatible donne null', async () => {
		await seedRecipeCatalog();
		const user = await createPaidUser();
		expect(await loadBreakfastBackfillContext(user.id)).toBeNull();

		await createNutritionProfile(user.id);
		const ctx = await loadBreakfastBackfillContext(user.id);
		expect(ctx?.breakfastRecipes.length).toBeGreaterThan(0);
		expect(ctx?.mealTargets).not.toBeNull();

		// Catalogue vide : aucune recette de petit-déjeuner à proposer.
await prisma.recipe.deleteMany();
invalidateRecipeCatalog();
expect(await loadBreakfastBackfillContextFromProfile(user.id, profile, 82)).toBeNull();
	});

	it('ajoute un petit-déjeuner aux seuls jours qui n’en ont pas, puis ne fait plus rien', async () => {
		await seedRecipeCatalog();
		const user = await createPaidUser();
		await createNutritionProfile(user.id);
		const ctx = (await loadBreakfastBackfillContext(user.id))!;
		const incomplete = await dayWithoutBreakfast(user.id, 1);
		const empty = await prisma.nutritionDay.create({ data: { userId: user.id, dayIndex: 2 } });
		const complete = await dayWithoutBreakfast(user.id, 3);
		await ensureBreakfastMealForDay(user.id, 3, complete.id, ctx);

		const days = await prisma.nutritionDay.findMany({ where: { userId: user.id }, include: { meals: true }, orderBy: { dayIndex: 'asc' } });
		const changed = await backfillMissingBreakfastMeals(user.id, days.map((d) => ({ id: d.id, dayIndex: d.dayIndex, meals: d.meals })), ctx);
		expect(changed).toBe(true);
		expect(await positionsOf(incomplete.id)).toEqual(['BREAKFAST', 'DINNER', 'LUNCH']);
		expect(await positionsOf(empty.id)).toEqual([]);
		const breakfast = await prisma.meal.findFirstOrThrow({ where: { nutritionDayId: incomplete.id, position: 'BREAKFAST' } });
		expect(breakfast.quantityG).toBeGreaterThan(0);

		const again = await prisma.nutritionDay.findMany({ where: { userId: user.id }, include: { meals: true } });
		expect(await backfillMissingBreakfastMeals(user.id, again.map((d) => ({ id: d.id, dayIndex: d.dayIndex, meals: d.meals })), ctx)).toBe(false);
	});

	it('ne propose rien sans recette : aucune écriture et résultat faux', async () => {
		const user = await createPaidUser();
		const day = await prisma.nutritionDay.create({ data: { userId: user.id, dayIndex: 1 } });
		const ctx = { breakfastRecipes: [], mealTargets: null };
		expect(await backfillMissingBreakfastMeals(user.id, [{ id: day.id, dayIndex: 1, meals: [{ position: 'LUNCH' }] }], ctx)).toBe(false);
		expect(await ensureBreakfastMealForDay(user.id, 1, day.id, ctx)).toBe(false);
		expect(await ensureBreakfastMealForDay(user.id, 1, day.id)).toBe(false);
		expect(await prisma.meal.count()).toBe(0);
	});

	it('crée le petit-déjeuner d’un jour (levée du jeûne), une seule fois, en chargeant son contexte si besoin', async () => {
		await seedRecipeCatalog();
		const user = await createPaidUser();
		await createNutritionProfile(user.id);
		const day = await dayWithoutBreakfast(user.id, 5);

		expect(await ensureBreakfastMealForDay(user.id, 5, day.id)).toBe(true);
		expect(await positionsOf(day.id)).toEqual(['BREAKFAST', 'DINNER', 'LUNCH']);
		expect(await ensureBreakfastMealForDay(user.id, 5, day.id)).toBe(false);
		expect(await prisma.meal.count({ where: { nutritionDayId: day.id, position: 'BREAKFAST' } })).toBe(1);
	});
});
