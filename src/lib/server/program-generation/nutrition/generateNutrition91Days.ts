import { prisma } from '$lib/server';
import type { MealPosition, Prisma } from '@prisma/client';
import { NUTRITION_SEGMENT_DAYS } from '$lib/nutrition/nutritionPlanConstants';
import { mealTargetsFromProfile } from '$lib/server/nutrition/userMealTargets';
import { fitRecipeSelect } from '$lib/server/nutrition/rescaleUserMeals';
import { planNutritionDays } from './planNutritionDays';
import { filterRecipesForUser } from './recipeFilterUtils';
import { programGenLog, programGenTrace, programGenWarn } from '../programGenerationLog';

/** Documents par `createMany` de repas. */
const CREATE_CHUNK = 300;
/** Mises à jour par transaction. */
const UPDATE_CHUNK = 60;

/** @deprecated Utiliser NUTRITION_SEGMENT_DAYS depuis $lib/nutrition/nutritionPlanConstants */
export const PROGRAM_NUTRITION_DAYS = NUTRITION_SEGMENT_DAYS;

const nutritionGenProfileSelect = {
	breakfastEnabled: true,
	intermittentFastingMorning: true,
	allergens: true,
	activityLevel: true,
	bodyFatPercent: true,
	weightLossGoalKg: true,
	breadDaily: true,
	breadGramsPerDay: true,
	breadType: true,
	disgustingFoods: true,
	otherAllergens: true
} satisfies Prisma.UserProfileSelect;

const recipeCatalogSelect = {
	id: true,
	category: true,
	referenceYieldG: true,
	nutritionKcal: true,
	nutritionProteinG: true,
	nutritionCarbsG: true,
	nutritionFatG: true,
	nutritionFiberG: true,
	allergens: true,
	name: true,
	ingredients: { select: { name: true, quantityG: true, category: true }, orderBy: { order: 'asc' } }
} satisfies Prisma.RecipeSelect;

/**
 * Génère les journées nutrition 1..targetDays (NutritionDay + Meal) depuis le catalogue admin.
 * Exclut les recettes contenant un allergène déclaré par l’utilisateur.
 * Recettes choisies et portions ajustées par journée ($lib/nutrition/dayPlanner) : facteur de chaque recette + complément
 * féculent, totaux du jour au plus près des cibles du profil (kcal, protéines, glucides, lipides, fibres).
 * Répartition kcal sur le budget repas : p'tit déj ou collation 20 %, déj. 40 %, dîner 40 % (50/50 en jeûne).
 * Le jeûne intermittent est un comportement d'affichage utilisateur (cacher le petit-déj), pas de suppression des repas en BDD.
 */
export async function generateNutritionDaysForUser(userId: string, targetDays: number): Promise<void> {
	programGenLog('N1/ generateNutritionDaysForUser — entrée', { userId, targetDays });
	if (targetDays < 1) {
		programGenWarn('N1/ ABORT targetDays < 1', { userId, targetDays });
		return;
	}

	const profile = await prisma.userProfile.findUnique({
		where: { userId },
		select: nutritionGenProfileSelect
	});

	const intermittentFastingDefault = profile?.intermittentFastingMorning === true;
	const userAllergens = profile?.allergens ?? [];

	programGenLog('N2/ Profil nutrition (extrait)', {
		userId,
		breakfastEnabled: profile?.breakfastEnabled ?? false,
		intermittentFastingDefault,
		allergens: userAllergens,
		activityLevel: profile?.activityLevel ?? null,
		bodyFatPercent: profile?.bodyFatPercent ?? null,
		weightLossGoalKg: profile?.weightLossGoalKg ?? null,
		breadDaily: profile?.breadDaily ?? false,
		breadGramsPerDay: profile?.breadGramsPerDay ?? null,
		breadType: profile?.breadType ?? null
	});

	const lastMeasure = await prisma.bodyMeasurement.findFirst({
		where: { userId },
		orderBy: { createdAt: 'desc' },
		select: { weightKg: true }
	});
	const weightKg = lastMeasure?.weightKg ?? null;

	programGenLog('N3/ Dernière mensuration (poids)', {
		userId,
		weightKg,
		note: weightKg == null ? 'pas de poids → pas de calories cibles (échelle 1 sur portions ref.)' : null
	});

	// Cibles journalières des repas (kcal, P, G, L, fibres), pain quotidien déduit.
	const mealTargets = mealTargetsFromProfile(profile, weightKg);

	programGenLog('N4/ Cibles journalières des repas (hors pain)', {
		userId,
		mealTargets: mealTargets
			? Object.fromEntries(Object.entries(mealTargets).map(([k, v]) => [k, Math.round(v * 10) / 10]))
			: null
	});

	const recipesRaw = await prisma.recipe.findMany({
		where: { isCustom: false, active: true },
		select: recipeCatalogSelect
	});

	const recipes = filterRecipesForUser(recipesRaw, profile);

	programGenLog('N5/ Catalogue recettes admin', {
		userId,
		catalogActive: recipesRaw.length,
		afterAllergenFilter: recipes.length,
		excludedByAllergen: recipesRaw.length - recipes.length
	});

	const breakfastRecipes = recipes.filter((r) => r.category === 'BREAKFAST');
	const mealRecipes = recipes.filter((r) => r.category === 'MEAL');

	if (mealRecipes.length === 0) {
		programGenTrace('generate_abort', {
			userId,
			reason: 'no_meal_recipes_in_catalog',
			catalogActive: recipesRaw.length,
			userAllergens
		});
		programGenWarn(
			'N6/ ABORT — aucune recette MEAL utilisable (actives + sans conflit allergènes)',
			{ userId, catalogActive: recipesRaw.length, userAllergens }
		);
		return;
	}

	const breakfastEnabled = profile?.breakfastEnabled ?? false;

	if (breakfastEnabled && breakfastRecipes.length === 0) {
		programGenWarn(
			'N6/ WARN — breakfastEnabled mais zéro recette BREAKFAST après filtrage allergènes — créneau petit-déj ignoré',
			{ userId, userAllergens }
		);
	}

	programGenLog('N6/ Pools par catégorie', {
		userId,
		breakfastEnabled,
		breakfastPool: breakfastRecipes.length,
		mealPool: mealRecipes.length
	});

	// Trois repas par jour dès qu'il existe un petit-déjeuner utilisable (le jeûne le masque à l'affichage, il reste en BDD).
	const positions: MealPosition[] =
		breakfastRecipes.length > 0 ? ['BREAKFAST', 'LUNCH', 'DINNER'] : ['LUNCH', 'DINNER'];

	programGenLog('N7/ Boucle jours — positions repas', {
		userId,
		positions,
		budgetFractions: intermittentFastingDefault ? '20% PD (masqué) / 50% déj. / 50% dîner' : '20% / 40% / 40% (PD / déj. / dîner)',
		macrosDistributed: 'kcal, protéines, glucides, lipides, fibres répartis proportionnellement',
		recipeSelection: 'déjeuner tiré au sort (graine userId+jour), autres créneaux choisis pour la journée la plus proche des cibles ; pas de recette des 3 jours précédents'
	});

	const existingDays = await prisma.nutritionDay.findMany({
		where: { userId, dayIndex: { lte: targetDays } },
		include: { meals: { include: { recipe: { select: fitRecipeSelect } } } }
	});

	const plan = planNutritionDays({
		userId,
		targetDays,
		existingDays,
		positions,
		intermittentFastingDefault,
		mealTargets,
		pools: { BREAKFAST: breakfastRecipes, MEAL: mealRecipes }
	});

	for (const sample of plan.samples) {
		programGenLog(`N8/ Jour ${sample.dayIndex}/${targetDays} (échantillon)`, {
			userId,
			dayIndex: sample.dayIndex,
			slotsToCreate: sample.positions.length,
			positions: sample.positions,
			recipeIds: sample.recipeIds,
			scales: sample.scales,
			mealBudgetKcal: mealTargets ? Math.round(mealTargets.kcal) : null,
			split: intermittentFastingDefault ? '50/50' : '20/40/40'
		});
	}

	const dayIdByIndex = new Map(existingDays.map((d) => [d.dayIndex, d.id]));
	if (plan.daysToCreate.length > 0) {
		await prisma.nutritionDay.createMany({
			data: plan.daysToCreate.map((d) => ({ userId, ...d }))
		});
		const created = await prisma.nutritionDay.findMany({
			where: { userId, dayIndex: { in: plan.daysToCreate.map((d) => d.dayIndex) } },
			select: { id: true, dayIndex: true }
		});
		for (const d of created) dayIdByIndex.set(d.dayIndex, d.id);
	}

	for (let k = 0; k < plan.mealCreates.length; k += CREATE_CHUNK) {
		await prisma.meal.createMany({
			data: plan.mealCreates.slice(k, k + CREATE_CHUNK).map(({ dayIndex, position, recipeId, portion }) => ({
				nutritionDayId: dayIdByIndex.get(dayIndex)!,
				position,
				recipeId,
				...portion
			}))
		});
	}

	// Mises à jour par lots transactionnels (MongoDB annule une transaction au-delà de 60 s).
	for (let k = 0; k < plan.mealUpdates.length; k += UPDATE_CHUNK) {
		await prisma.$transaction(
			plan.mealUpdates
				.slice(k, k + UPDATE_CHUNK)
				.map(({ mealId, portion }) => prisma.meal.update({ where: { id: mealId }, data: portion }))
		);
	}

	programGenLog('N9/ Résumé écriture BDD', {
		userId,
		targetDays,
		nutritionDaysCreated: plan.daysToCreate.length,
		daysWithNewMeals: plan.daysTouched,
		mealsCreated: plan.mealCreates.length,
		mealsUpdated: plan.mealUpdates.length
	});
}

/** @deprecated Utiliser generateNutritionDaysForUser(userId, targetDays) */
export async function generateNutrition91Days(userId: string): Promise<void> {
	return generateNutritionDaysForUser(userId, NUTRITION_SEGMENT_DAYS);
}
