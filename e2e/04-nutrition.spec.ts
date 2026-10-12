/**
 * Zone 4 — Nutrition : cadencier, fiche du jour, choix d'un repas, jeûne, allergènes, courses, recettes.
 * Documentation : docs/app/04-nutrition.md.
 *
 * Le cadencier est généré par le vrai code de production (cron de rattrapage), sur le catalogue du seed.
 */
import { test, expect } from './support/test';
import { createOnboardedUser, db, loginAs } from './support/db';
import { generateNutritionPlan } from './support/flows';
import { normalizeAllergens } from '../src/lib/schema/recipe/allergens';

test.describe('Cadencier', () => {
	test('N1 · la semaine affiche le jour courant et ses 3 repas avec les cibles du jour', async ({ page, context, request }) => {
		const user = await createOnboardedUser({ dayIndex: 3 });
		await generateNutritionPlan(request, user.id);
		await loginAs(context, user.id);

		await page.goto('/user/nutrition/cadencier');
		await expect(page).toHaveURL(/semaine=1/);
		await expect(page.getByText(/cibles repas du jour/i)).toBeVisible();
		for (const slot of [/repas 1 — p’tit déj/i, /repas 2 — déjeuner/i, /repas 3 — dîner/i]) {
			await expect(page.getByText(slot)).toBeVisible();
		}
		await expect(page.getByRole('button', { name: /mer 3 auj\.|3 auj\./i })).toBeVisible();
	});

	test('N2 · la fiche du jour détaille ingrédients, préparation et allergènes en français', async ({ page, context, request }) => {
		const user = await createOnboardedUser({ dayIndex: 3 });
		await generateNutritionPlan(request, user.id);
		await loginAs(context, user.id);

		await page.goto('/user/nutrition/cadencier/3');
		await expect(page.getByText(/ingrédients/i).first()).toBeVisible();
		await expect(page.getByText(/préparation/i).first()).toBeVisible();
		const allergens = page.locator('.allergens').first();
		if (await allergens.count()) {
			// Codes du catalogue (eggs, milk…) affichés avec leurs libellés français.
			await expect(allergens).not.toContainText(/\b(eggs|milk|nuts|fish|soy|peanuts|shellfish)\b/);
		}
	});

	test('N3 · choisir une autre recette pour un repas', async ({ page, context, request }) => {
		const user = await createOnboardedUser({ dayIndex: 3 });
		await generateNutritionPlan(request, user.id);
		await loginAs(context, user.id);
		const day = await db.nutritionDay.findFirstOrThrow({ where: { userId: user.id, dayIndex: 3 }, include: { meals: true } });
		const lunch = day.meals.find((m) => m.position === 'LUNCH')!;
		const other = await db.recipe.findFirstOrThrow({ where: { category: 'MEAL', id: { not: lunch.recipeId ?? undefined } } });

		await page.goto('/user/nutrition/cadencier/3/edit-meal/lunch');
		await page.getByRole('button', { name: new RegExp(other.name.slice(0, 25).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }).first().click();
		await page.getByRole('button', { name: /valider cette recette/i }).click();
		await expect(page).toHaveURL(/\/user\/nutrition\/cadencier\/3(#lunch)?$/);

		await expect
			.poll(async () => (await db.meal.findFirstOrThrow({ where: { nutritionDayId: day.id, position: 'LUNCH' } })).recipeId)
			.toBe(other.id);
	});

	test('N4 · jeûne intermittent du jour : activable, les portions des autres repas sont recalculées', async ({ page, context, request }) => {
		const user = await createOnboardedUser({ dayIndex: 3 });
		await generateNutritionPlan(request, user.id);
		await loginAs(context, user.id);
		const before = await db.nutritionDay.findFirstOrThrow({ where: { userId: user.id, dayIndex: 3 }, include: { meals: true } });
		const lunchBefore = before.meals.find((m) => m.position === 'LUNCH')!.calcCalories;

		await page.goto('/user/nutrition/cadencier');
		await page.getByRole('button', { name: /jeûne intermittent — jour 3/i }).click();
		await expect(page.getByRole('button', { name: /jeûne intermittent — jour 3/i })).not.toContainText(/inactif/i);

		await expect
			.poll(async () => (await db.nutritionDay.findFirstOrThrow({ where: { userId: user.id, dayIndex: 3 } })).intermittentFasting)
			.toBe(true);
		// Déjeuner et dîner passent de 40 % à 50 % du budget du jour (petit-déjeuner masqué).
		await expect
			.poll(async () => {
				const day = await db.nutritionDay.findFirstOrThrow({ where: { userId: user.id, dayIndex: 3 }, include: { meals: true } });
				return day.meals.find((m) => m.position === 'LUNCH')!.calcCalories ?? 0;
			})
			.toBeGreaterThan((lunchBefore ?? 0) * 1.1);
	});

	test('N5 · allergies déclarées : aucune recette du cadencier ne les contient', async ({ request }) => {
		const user = await createOnboardedUser({ dayIndex: 3 });
		await db.userProfile.update({ where: { userId: user.id }, data: { allergens: ['poisson', 'arachides'] } });
		await generateNutritionPlan(request, user.id);

		const meals = await db.meal.findMany({ where: { nutritionDay: { userId: user.id } }, include: { recipe: true } });
		expect(meals.length).toBeGreaterThan(0);
		for (const meal of meals) {
			// Le catalogue code ces allergènes en anglais (fish, peanuts) : ils doivent être reconnus.
			expect(normalizeAllergens(meal.recipe?.allergens), meal.recipe?.name).not.toContain('poisson');
			expect(normalizeAllergens(meal.recipe?.allergens), meal.recipe?.name).not.toContain('arachides');
		}
	});

	test('N6 · sans l’offre nutrition, la nutrition renvoie vers la souscription', async ({ page, context }) => {
		const user = await createOnboardedUser({ offerSlugs: ['sport'], nutritionDaysAllocated: 0 });
		await loginAs(context, user.id);
		await page.goto('/user/nutrition/cadencier');
		await expect(page).toHaveURL(/\/auth\/subscription\?besoin=nutrition/);
	});
});

test.describe('Courses et recettes', () => {
	test('N7 · liste de courses de la semaine : un article coché le reste', async ({ page, context, request }) => {
		const user = await createOnboardedUser({ dayIndex: 3 });
		await generateNutritionPlan(request, user.id);
		await loginAs(context, user.id);

		await page.goto('/user/nutrition/courses');
		await expect(page.getByText(/jours 3–7 du programme/i)).toBeVisible();
		await page.locator('form[action="?/toggleItem"] button.checkbox').first().click();
		await expect(page.getByText(/1\/\d+ cochés/)).toBeVisible();

		await page.reload();
		await expect(page.getByText(/1\/\d+ cochés/)).toBeVisible();
		expect(await db.shoppingItem.count({ where: { isChecked: true } })).toBe(1);
	});

	test('N8 · recette en favori : visible dans l’onglet Favoris', async ({ page, context, request }) => {
		const user = await createOnboardedUser({ dayIndex: 3 });
		await generateNutritionPlan(request, user.id);
		await loginAs(context, user.id);
		const recipe = await db.recipe.findFirstOrThrow({ where: { category: 'MEAL' } });

		await page.goto(`/user/nutrition/recettes/${recipe.id}`);
		await page.getByRole('button', { name: '☆' }).click();
		await expect(page.getByRole('button', { name: '★' })).toBeVisible();

		await page.goto('/user/nutrition/recettes');
		await expect(page.getByRole('button', { name: /favoris \(1\)/i })).toBeVisible();
		expect(await db.userFavoriteRecipe.count({ where: { userId: user.id, recipeId: recipe.id } })).toBe(1);
	});

	test('N9 · créer sa propre recette', async ({ page, context, request }) => {
		const user = await createOnboardedUser({ dayIndex: 3 });
		await generateNutritionPlan(request, user.id);
		await loginAs(context, user.id);

		await page.goto('/user/nutrition/recettes/create');
		await page.locator('input[name=name]').fill('Bowl maison e2e');
		await page.locator('select[name=category]').selectOption({ label: 'Repas' });
		await page.locator('input[name=nutritionKcal]').fill('600');
		await page.locator('input[name=nutritionProteinG]').fill('40');
		await page.locator('input[name=nutritionCarbsG]').fill('60');
		await page.locator('input[name=nutritionFatG]').fill('20');
		await page.getByRole('button', { name: /enregistrer la recette/i }).click();

		await expect.poll(() => db.recipe.count({ where: { name: 'Bowl maison e2e', userId: user.id, isCustom: true } })).toBe(1);
		await page.goto('/user/nutrition/recettes');
		await expect(page.getByRole('button', { name: /mes recettes \(1\)/i })).toBeVisible();
	});
});
