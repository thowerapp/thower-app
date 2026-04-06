import { prisma } from '$lib/server';
import type { ActivityLevel, MealPosition, Prisma, RecipeCategory } from '@prisma/client';
import { NUTRITION_SEGMENT_DAYS } from '$lib/nutrition/nutritionPlanConstants';
import { targetCaloriesPerDay } from '$lib/nutrition/nutritionTargets';
import { breadMacrosForGrams, type BreadTypeValue } from '$lib/schema/profile/breadType';
import { programGenLog, programGenWarn } from '../programGenerationLog';

/** @deprecated Utiliser NUTRITION_SEGMENT_DAYS depuis $lib/nutrition/nutritionPlanConstants */
export const PROGRAM_NUTRITION_DAYS = NUTRITION_SEGMENT_DAYS;

const DEFAULT_REFERENCE_G = 100;
const SCALE_MIN = 0.35;
const SCALE_MAX = 2.5;

/** Part du budget repas (hors pain) pour chaque créneau — jeûne intermittent matin : 30 / 35 / 35 ; sinon 50 / 50 déj.–dîner. */
function kcalFractionForPosition(position: MealPosition, intermittentFastingMorning: boolean): number {
	if (intermittentFastingMorning) {
		switch (position) {
			case 'BREAKFAST':
				return 0.3;
			case 'LUNCH':
				return 0.35;
			case 'DINNER':
				return 0.35;
			default:
				return 1 / 3;
		}
	}
	switch (position) {
		case 'LUNCH':
		case 'DINNER':
			return 0.5;
		default:
			return 0.5;
	}
}

function clampScale(scale: number): number {
	return Math.min(SCALE_MAX, Math.max(SCALE_MIN, scale));
}

/** Ligne profil attendue — select casté car les types Prisma générés peuvent être en retard sur le schéma. */
type NutritionGenProfileRow = {
	breakfastEnabled: boolean;
	intermittentFastingMorning: boolean | null;
	allergens: string[];
	activityLevel: ActivityLevel | null;
	bodyFatPercent: number | null;
	weightLossGoalKg: number | null;
	breadDaily: boolean;
	breadGramsPerDay: number | null;
	/** Enum Prisma `BreadType` — typé en string pour éviter les exports d’enum variables selon versions client. */
	breadType: string | null;
};

const nutritionGenProfileSelect = {
	breakfastEnabled: true,
	intermittentFastingMorning: true,
	allergens: true,
	activityLevel: true,
	bodyFatPercent: true,
	weightLossGoalKg: true,
	breadDaily: true,
	breadGramsPerDay: true,
	breadType: true
} as unknown as Prisma.UserProfileSelect;

const recipeCatalogSelect = {
	id: true,
	category: true,
	referenceYieldG: true,
	nutritionKcal: true,
	nutritionProteinG: true,
	nutritionCarbsG: true,
	nutritionFatG: true,
	allergens: true
} as unknown as Prisma.RecipeSelect;

type CatalogRecipe = {
	id: string;
	category: RecipeCategory;
	referenceYieldG: number | null;
	nutritionKcal: number | null;
	nutritionProteinG: number | null;
	nutritionCarbsG: number | null;
	nutritionFatG: number | null;
	allergens: string[];
};

function recipeConflictsAllergens(recipeAllergens: string[], userAllergens: string[]): boolean {
	const avoid = new Set(userAllergens);
	return recipeAllergens.some((a) => avoid.has(a));
}

function mealQuantityG(recipe: CatalogRecipe): number {
	if (recipe.referenceYieldG != null && recipe.referenceYieldG > 0) {
		return recipe.referenceYieldG;
	}
	return DEFAULT_REFERENCE_G;
}

function scaledMacrosForQuantity(recipe: CatalogRecipe, quantityG: number) {
	const refG =
		recipe.referenceYieldG != null && recipe.referenceYieldG > 0
			? recipe.referenceYieldG
			: DEFAULT_REFERENCE_G;
	const factor = quantityG / refG;
	return {
		calcCalories: recipe.nutritionKcal != null ? recipe.nutritionKcal * factor : null,
		calcProteinG: recipe.nutritionProteinG != null ? recipe.nutritionProteinG * factor : null,
		calcCarbsG: recipe.nutritionCarbsG != null ? recipe.nutritionCarbsG * factor : null,
		calcFatG: recipe.nutritionFatG != null ? recipe.nutritionFatG * factor : null
	};
}

function kcalAtBaseQuantity(recipe: CatalogRecipe): number {
	const q = mealQuantityG(recipe);
	const m = scaledMacrosForQuantity(recipe, q);
	return m.calcCalories ?? 0;
}

/** Graine déterministe (FNV-1a) pour tirage pseudo-aléatoire stable par user / jour / créneau. */
function catalogPickSeed(userId: string, dayIndex: number, position: string, slotIndex: number): number {
	const s = `${userId}\0${dayIndex}\0${position}\0${slotIndex}`;
	let h = 2166136261 >>> 0;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619) >>> 0;
	}
	return h >>> 0;
}

/** Mulberry32 → [0, 1). */
function mulberry32(initial: number): () => number {
	let a = initial >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Tirage uniforme dans le pool (après filtre allergènes) — varie par jour/créneau, reproductible pour un même couple (user, jour, position). */
function pickRandomFromPool<T>(items: T[], seed: number): T | null {
	if (items.length === 0) return null;
	const rng = mulberry32(seed);
	const idx = Math.floor(rng() * items.length);
	return items[idx] ?? null;
}

/**
 * Génère les journées nutrition 1..targetDays (NutritionDay + Meal) depuis le catalogue admin.
 * Exclut les recettes contenant un allergène déclaré par l’utilisateur.
 * Ajuste les quantités pour viser les calories cibles (TDEE − déficit) lorsque le profil le permet.
 * Répartition kcal sur le budget repas : si jeûne intermittent matin → petit-déj 30 %, déj. 35 %, dîner 35 % ;
 * sinon déj. 50 %, dîner 50 % (pas de petit-déj généré).
 */
export async function generateNutritionDaysForUser(userId: string, targetDays: number): Promise<void> {
	programGenLog('N1/ generateNutritionDaysForUser — entrée', { userId, targetDays });
	if (targetDays < 1) {
		programGenWarn('N1/ ABORT targetDays < 1', { userId, targetDays });
		return;
	}

	const profile = (await prisma.userProfile.findUnique({
		where: { userId },
		select: nutritionGenProfileSelect
	})) as NutritionGenProfileRow | null;

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

	const targetKcal =
		weightKg != null && weightKg > 0
			? targetCaloriesPerDay({
					weightKg,
					bodyFatPercent: profile?.bodyFatPercent,
					activityLevel: profile?.activityLevel as ActivityLevel | null | undefined,
					weightLossGoalKg: profile?.weightLossGoalKg
				})
			: null;

	programGenLog('N4/ Calories cibles repas (hors pain)', {
		userId,
		targetKcal,
		unit: 'kcal/j'
	});

	let breadKcal = 0;
	if (
		profile?.breadDaily &&
		profile.breadType &&
		profile.breadGramsPerDay != null &&
		profile.breadGramsPerDay > 0
	) {
		breadKcal = breadMacrosForGrams(profile.breadType as BreadTypeValue, profile.breadGramsPerDay).kcal;
	}
	if (breadKcal > 0) {
		programGenLog('N4b/ Apport pain déduit du budget repas', { userId, breadKcal });
	}

	const recipesRaw = (await prisma.recipe.findMany({
		where: { isCustom: false, active: true },
		select: recipeCatalogSelect
	})) as unknown as CatalogRecipe[];

	const recipes = recipesRaw.filter((r) => !recipeConflictsAllergens(r.allergens, userAllergens));

	programGenLog('N5/ Catalogue recettes admin', {
		userId,
		catalogActive: recipesRaw.length,
		afterAllergenFilter: recipes.length,
		excludedByAllergen: recipesRaw.length - recipes.length
	});

	const breakfastRecipes = recipes.filter((r) => r.category === 'BREAKFAST');
	const mealRecipes = recipes.filter((r) => r.category === 'MEAL');
	const fallbackPool = mealRecipes.length > 0 ? mealRecipes : recipes;

	if (fallbackPool.length === 0) {
		programGenWarn(
			'N6/ ABORT — aucune recette catalogue utilisable (actives + sans conflit allergènes)',
			{ userId, catalogActive: recipesRaw.length, userAllergens }
		);
		return;
	}

	const breakfastPool = breakfastRecipes.length > 0 ? breakfastRecipes : fallbackPool;

	programGenLog('N6/ Pools par catégorie', {
		userId,
		breakfastPool: breakfastPool.length,
		mealRecipes: mealRecipes.length,
		fallbackPool: fallbackPool.length
	});

	const positions: MealPosition[] = intermittentFastingDefault
		? ['BREAKFAST', 'LUNCH', 'DINNER']
		: ['LUNCH', 'DINNER'];

	programGenLog('N7/ Boucle jours — positions repas', {
		userId,
		positions,
		kcalSplit: intermittentFastingDefault ? '30% / 35% / 35% (PD / déj. / dîner)' : '50% / 50% (déj. / dîner)',
		recipeSelection: 'pseudo-aléatoire (graine userId+jour+créneau, Mulberry32)'
	});

	let nutritionDaysCreated = 0;
	let mealsCreated = 0;
	let daysTouched = 0;

	for (let dayIndex = 1; dayIndex <= targetDays; dayIndex++) {
		let nutritionDay = await prisma.nutritionDay.findUnique({
			where: { userId_dayIndex: { userId, dayIndex } }
		});
		if (!nutritionDay) {
			nutritionDay = await prisma.nutritionDay.create({
				data: {
					userId,
					dayIndex,
					intermittentFasting: intermittentFastingDefault
				}
			});
			nutritionDaysCreated++;
		}

		const existingMeals = await prisma.meal.findMany({
			where: { nutritionDayId: nutritionDay.id },
			select: { position: true }
		});
		const hasPosition = new Set(existingMeals.map((m) => m.position));

		const toCreate: { position: MealPosition; recipe: CatalogRecipe }[] = [];

		for (let slot = 0; slot < positions.length; slot++) {
			const position = positions[slot];
			if (hasPosition.has(position)) continue;

			const pool =
				position === 'BREAKFAST' ? breakfastPool : mealRecipes.length > 0 ? mealRecipes : fallbackPool;
			const seed = catalogPickSeed(userId, dayIndex, position, slot);
			const recipe = pickRandomFromPool(pool, seed);
			if (recipe) toCreate.push({ position, recipe });
		}

		if (toCreate.length === 0) continue;

		daysTouched++;

		const mealBudget =
			targetKcal != null ? Math.max(targetKcal - breadKcal, 0) : 0;

		const scalesForLog: number[] = [];

		for (const { position, recipe } of toCreate) {
			const baseQ = mealQuantityG(recipe);
			const baseKcal = kcalAtBaseQuantity(recipe);
			let scale = 1;
			if (targetKcal != null && mealBudget > 0 && baseKcal > 0) {
				const frac = kcalFractionForPosition(position, intermittentFastingDefault);
				const targetSlotKcal = mealBudget * frac;
				scale = clampScale(targetSlotKcal / baseKcal);
			}
			scalesForLog.push(Math.round(scale * 1000) / 1000);

			const quantityG = baseQ * scale;
			const macros = scaledMacrosForQuantity(recipe, quantityG);

			await prisma.meal.create({
				data: {
					nutritionDayId: nutritionDay.id,
					position,
					recipeId: recipe.id,
					quantityG,
					...macros
				}
			});
			mealsCreated++;
		}

		if (dayIndex === 1 || dayIndex === targetDays || dayIndex % 30 === 0) {
			programGenLog(`N8/ Jour ${dayIndex}/${targetDays} (échantillon)`, {
				userId,
				dayIndex,
				slotsToCreate: toCreate.length,
				positions: toCreate.map((t) => t.position),
				recipeIds: toCreate.map((t) => t.recipe.id),
				scales: scalesForLog,
				mealBudget: Math.round(mealBudget * 10) / 10,
				targetKcal,
				split: intermittentFastingDefault ? '30/35/35' : '50/50'
			});
		}
	}

	programGenLog('N9/ Résumé écriture BDD', {
		userId,
		targetDays,
		nutritionDaysCreated,
		daysWithNewMeals: daysTouched,
		mealsCreated
	});
}

/** @deprecated Utiliser generateNutritionDaysForUser(userId, targetDays) */
export async function generateNutrition91Days(userId: string): Promise<void> {
	return generateNutritionDaysForUser(userId, NUTRITION_SEGMENT_DAYS);
}
