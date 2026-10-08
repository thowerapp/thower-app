import { prisma } from '$lib/server';
import type { MealPosition, Prisma, RecipeCategory } from '@prisma/client';
import { NUTRITION_SEGMENT_DAYS } from '$lib/nutrition/nutritionPlanConstants';
import { mealTargetsFromProfile } from '$lib/server/nutrition/userMealTargets';
import { fitDay, pickDayRecipes } from '$lib/nutrition/dayPlanner';
import { fitRecipeSelect, fixedDayMacros, isAdjustableMeal } from '$lib/server/nutrition/rescaleUserMeals';
import { programGenLog, programGenTrace, programGenWarn } from '../programGenerationLog';

/** Jours précédents dont les recettes ne sont pas reprises. */
const RECENT_DAYS = 3;

/** @deprecated Utiliser NUTRITION_SEGMENT_DAYS depuis $lib/nutrition/nutritionPlanConstants */
export const PROGRAM_NUTRITION_DAYS = NUTRITION_SEGMENT_DAYS;

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
	ingredients: { select: { name: true, quantityG: true, category: true }, orderBy: { order: 'asc' } }
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
	ingredients: { name: string; quantityG: number | null; category: string | null }[];
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

	// Cibles journalières des repas (kcal, P, G, L, fibres), pain quotidien déduit.
	const mealTargets = mealTargetsFromProfile(profile, weightKg);

	programGenLog('N4/ Cibles journalières des repas (hors pain)', {
		userId,
		mealTargets: mealTargets
			? Object.fromEntries(Object.entries(mealTargets).map(([k, v]) => [k, Math.round(v * 10) / 10]))
			: null
	});

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
		budgetFractions: intermittentFastingDefault ? '20% PD (masqué) / 50% déj. / 50% dîner' : '20% / 40% / 40% (PD / déj. / dîner)',
		macrosDistributed: 'kcal, protéines, glucides, lipides, fibres répartis proportionnellement',
		recipeSelection: 'déjeuner tiré au sort (graine userId+jour), autres créneaux choisis pour la journée la plus proche des cibles ; pas de recette des 3 jours précédents'
	});

	let nutritionDaysCreated = 0;
	let mealsCreated = 0;
	let daysTouched = 0;
	let recentDays: string[][] = [];

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
			include: { recipe: { select: fitRecipeSelect } }
		});
		const hasPosition = new Set(existingMeals.map((m) => m.position));
		const missing = positions.filter((p) => !hasPosition.has(p));

		// Recettes des 3 derniers jours : pas reprises (variété).
		const recentRecipeIds = new Set(recentDays.flat());
		if (missing.length === 0) {
			recentDays = [...recentDays.slice(-(RECENT_DAYS - 1)), existingMeals.map((m) => m.recipeId).filter((id): id is string => !!id)];
			continue;
		}

		daysTouched++;

		const fasting = nutritionDay.intermittentFasting;
		const kept = existingMeals.filter(isAdjustableMeal);
		const fixed = fixedDayMacros(existingMeals, fasting);
		const picks = pickDayRecipes({
			positionsToFill: missing,
			existing: kept.map((m) => ({ position: m.position, recipe: m.recipe!, recipeId: m.recipeId })),
			pools: { BREAKFAST: breakfastRecipes, MEAL: mealRecipes },
			daily: mealTargets,
			intermittentFasting: fasting,
			fixed,
			recentRecipeIds,
			random: mulberry32(catalogPickSeed(userId, dayIndex, 'DAY', 0))
		});

		// Journée entière ajustée ensemble : repas existants ajustables + repas créés.
		const planned = [
			...kept.map((m) => ({ mealId: m.id as string | null, position: m.position, recipeId: m.recipeId!, recipe: m.recipe! })),
			...[...picks].map(([position, recipe]) => ({ mealId: null, position: position as MealPosition, recipeId: recipe.id, recipe }))
		];
		const portions = fitDay({ meals: planned, daily: mealTargets, intermittentFasting: fasting, fixed });

		const scalesForLog: number[] = [];
		for (const [k, meal] of planned.entries()) {
			const portion = portions[k];
			scalesForLog.push(Math.round((portion.quantityG / (meal.recipe.referenceYieldG || 100)) * 1000) / 1000);
			if (meal.mealId) {
				await prisma.meal.update({ where: { id: meal.mealId }, data: portion });
			} else {
				await prisma.meal.create({
					data: { nutritionDayId: nutritionDay.id, position: meal.position, recipeId: meal.recipeId, ...portion }
				});
				mealsCreated++;
			}
		}
		recentDays = [
			...recentDays.slice(-(RECENT_DAYS - 1)),
			[...existingMeals.map((m) => m.recipeId), ...planned.map((m) => m.recipeId)].filter((id): id is string => !!id)
		];
		const toCreate = [...picks].map(([position, recipe]) => ({ position, recipe }));

		if (dayIndex === 1 || dayIndex === targetDays || dayIndex % 30 === 0) {
			programGenLog(`N8/ Jour ${dayIndex}/${targetDays} (échantillon)`, {
				userId,
				dayIndex,
				slotsToCreate: toCreate.length,
				positions: toCreate.map((t) => t.position),
				recipeIds: toCreate.map((t) => t.recipe.id),
				scales: scalesForLog,
				mealBudgetKcal: mealTargets ? Math.round(mealTargets.kcal) : null,
				split: intermittentFastingDefault ? '50/50' : '20/40/40'
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
