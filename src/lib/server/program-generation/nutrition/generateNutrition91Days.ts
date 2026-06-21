import { prisma } from '$lib/server';
import type { MealPosition, Prisma, RecipeCategory } from '@prisma/client';
import { NUTRITION_SEGMENT_DAYS } from '$lib/nutrition/nutritionPlanConstants';
import { dailyProteinTargetG, targetCaloriesPerDay } from '$lib/nutrition/nutritionTargets';
import { breadMacrosForGrams, type BreadTypeValue } from '$lib/schema/profile/breadType';
import { programGenLog, programGenTrace, programGenWarn } from '../programGenerationLog';

/** @deprecated Utiliser NUTRITION_SEGMENT_DAYS depuis $lib/nutrition/nutritionPlanConstants */
export const PROGRAM_NUTRITION_DAYS = NUTRITION_SEGMENT_DAYS;

const DEFAULT_REFERENCE_G = 100;
const SCALE_MIN = 0.15;
const SCALE_MAX = 2.5;

/**
 * Fraction du budget calorique journalier pour chaque créneau repas.
 * Sans jeûne : BREAKFAST 30 %, LUNCH 35 %, DINNER 35 %.
 * Avec jeûne : BREAKFAST reste en BDD à 30 % (masqué côté UI) ; LUNCH et DINNER
 * absorbent chacun 50 % du budget visible.
 */
function mealBudgetFractionForPosition(position: MealPosition, intermittentFasting: boolean): number {
	if (intermittentFasting) {
		if (position === 'BREAKFAST') return 0.3;
		return 0.5; // LUNCH et DINNER
	}
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

function clampScale(scale: number): number {
	return Math.min(SCALE_MAX, Math.max(SCALE_MIN, scale));
}

/** Ligne profil attendue — select casté car les types Prisma générés peuvent être en retard sur le schéma. */
type NutritionGenProfileRow = {
	breakfastEnabled: boolean;
	intermittentFastingMorning: boolean | null;
	allergens: string[];
	activityLevel: string | null;
	bodyFatPercent: number | null;
	weightLossGoalKg: number | null;
	breadDaily: boolean;
	breadGramsPerDay: number | null;
	/** Enum Prisma `BreadType` — typé en string pour éviter les exports d’enum variables selon versions client. */
	breadType: string | null;
	disgustingFoods: string | null;
	otherAllergens: string | null;
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
	breadType: true,
	disgustingFoods: true,
	otherAllergens: true
} as unknown as Prisma.UserProfileSelect;

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
	ingredients: { select: { name: true } }
} as unknown as Prisma.RecipeSelect;

type CatalogRecipe = {
	id: string;
	category: RecipeCategory;
	referenceYieldG: number | null;
	nutritionKcal: number | null;
	nutritionProteinG: number | null;
	nutritionCarbsG: number | null;
	nutritionFatG: number | null;
	nutritionFiberG: number | null;
	allergens: string[];
	ingredients: { name: string }[];
	name: string;
};

/** Normalise une chaîne : minuscules + suppression des diacritiques. */
function normalize(str: string): string {
	return str
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');
}

/** Parse un champ texte libre (virgules, points-virgules, sauts de ligne) en termes normalisés non vides. */
function parseTextTerms(text: string | null | undefined): string[] {
	if (!text) return [];
	return text
		.split(/[,;\n]+/)
		.map((t) => normalize(t.trim()))
		.filter((t) => t.length > 0);
}

/**
 * Retourne true si la recette entière doit être exclue :
 * - Correspondance exacte sur les codes allergènes enum
 * - OU l'un des termes libres (otherAllergens, disgustingFoods) est contenu
 *   dans le nom de la recette ou le nom d'un ingrédient (insensible à la casse et aux accents).
 */
function recipeConflictsUser(
	recipe: CatalogRecipe,
	userAllergens: string[],
	freeTerms: string[]
): boolean {
	const avoid = new Set(userAllergens);
	if (recipe.allergens.some((a) => avoid.has(a))) return true;

	if (freeTerms.length === 0) return false;
	const recipeName = normalize(recipe.name);
	const ingredientNames = recipe.ingredients.map((i) => normalize(i.name));
	return freeTerms.some(
		(term) =>
			recipeName.includes(term) ||
			ingredientNames.some((ing) => ing.includes(term))
	);
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
		calcFatG: recipe.nutritionFatG != null ? recipe.nutritionFatG * factor : null,
		calcFiberG: recipe.nutritionFiberG != null ? recipe.nutritionFiberG * factor : null
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
 * Répartition kcal sur le budget repas : petit-déj 30 %, déj. 35 %, dîner 35 %.
 * Le jeûne intermittent est un comportement d'affichage utilisateur (cacher le petit-déj), pas de suppression des repas en BDD.
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
	const userFreeTerms = [
		...parseTextTerms(profile?.otherAllergens),
		...parseTextTerms(profile?.disgustingFoods)
	];

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
					activityLevel: profile?.activityLevel as import('@prisma/client').ActivityLevel | null
				})
			: null;

	const targetProteinG =
		weightKg != null &&
		weightKg > 0 &&
		profile?.bodyFatPercent != null &&
		profile.bodyFatPercent >= 3 &&
		profile.bodyFatPercent <= 70
			? dailyProteinTargetG(weightKg, profile.bodyFatPercent)
			: null;

	programGenLog('N4/ Cibles journalières (hors pain)', {
		userId,
		targetKcal,
		targetProteinG: targetProteinG != null ? Math.round(targetProteinG * 10) / 10 : null,
		unit: 'kcal/j + g protéine/j'
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

	const recipes = recipesRaw.filter((r) => !recipeConflictsUser(r, userAllergens, userFreeTerms));

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

	// BREAKFAST inclus si petit-déj activé OU jeûne intermittent (masqué à l'affichage, présent en BDD).
	const positions: MealPosition[] =
		breakfastRecipes.length > 0 && (breakfastEnabled || intermittentFastingDefault)
			? ['BREAKFAST', 'LUNCH', 'DINNER']
			: ['LUNCH', 'DINNER'];

	programGenLog('N7/ Boucle jours — positions repas', {
		userId,
		positions,
		budgetFractions: intermittentFastingDefault ? '30% PD (masqué) / 50% déj. / 50% dîner' : '30% / 35% / 35% (PD / déj. / dîner)',
		macrosDistributed: 'Calories, Protéines, Fibres répartis proportionnellement',
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

			const pool = position === 'BREAKFAST' ? breakfastRecipes : mealRecipes;
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
			const frac = mealBudgetFractionForPosition(position, intermittentFastingDefault);
			const baseQ = mealQuantityG(recipe);
			const baseKcal = kcalAtBaseQuantity(recipe);
			const baseProtein = recipe.nutritionProteinG ?? 0;

			const slotKcal = targetKcal != null && mealBudget > 0 ? mealBudget * frac : null;
			const slotProtein = targetProteinG != null && targetProteinG > 0 ? targetProteinG * frac : null;

			// Moindres carrés : minimise (kcal_réel/kcal_cible - 1)² + (prot_réelle/prot_cible - 1)²
			// Solution : scale = (a + b) / (a² + b²)  avec a = baseKcal/slotKcal, b = baseProtein/slotProtein
			const a = slotKcal != null && slotKcal > 0 && baseKcal > 0 ? baseKcal / slotKcal : null;
			const b = slotProtein != null && slotProtein > 0 && baseProtein > 0 ? baseProtein / slotProtein : null;
			let scale =
				a != null && b != null ? (a + b) / (a * a + b * b)
				: a != null ? 1 / a
				: b != null ? 1 / b
				: 1;
			scale = clampScale(scale);

			const quantityG = baseQ * scale;
			const macros = scaledMacrosForQuantity(recipe, quantityG);

			scalesForLog.push(Math.round(scale * 1000) / 1000);

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
				split: '30/35/35'
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
