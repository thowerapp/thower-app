import type { Prisma, PrismaClient, Role } from '@prisma/client';
import { prisma } from '$lib/server';

/** Vide toutes les collections (les index créés par `db push` sont conservés). */
export async function resetDatabase(): Promise<void> {
	const result = (await prisma.$runCommandRaw({ listCollections: 1, nameOnly: true })) as {
		cursor?: { firstBatch?: { name: string }[] };
	};
	const names = (result.cursor?.firstBatch ?? []).map((c) => c.name).filter((n) => !n.startsWith('system.'));
	for (const name of names) {
		await prisma.$runCommandRaw({ delete: name, deletes: [{ q: {}, limit: 0 }] });
	}
}

type QueryEventClient = PrismaClient<Prisma.PrismaClientOptions, 'query'>;

/**
 * Exécute `fn` et compte les requêtes envoyées à la base pendant son exécution.
 * Nécessite `PRISMA_COUNT_QUERIES=1` (posé par la configuration d'intégration).
 */
export async function countQueries<T>(fn: () => Promise<T>): Promise<{ result: T; queries: string[] }> {
	const queries: string[] = [];
	let active = true;
	(prisma as unknown as QueryEventClient).$on('query', (e) => {
		if (active) queries.push(e.query);
	});
	try {
		const result = await fn();
		return { result, queries };
	} finally {
		active = false;
	}
}

let seq = 0;
const unique = () => `${Date.now().toString(36)}-${++seq}`;

/** Utilisateur payant (accès valide 3 mois) ; options pour le rôle, le départ du programme, les cycles. */
export async function createPaidUser(
	options: {
		role?: Role;
		programStartDate?: Date | null;
		programCycleStarts?: Date[];
		nutritionDaysAllocated?: number;
		offerSlugs?: string[];
	} = {}
) {
	const user = await prisma.user.create({
		data: {
			email: `user-${unique()}@test.local`,
			role: options.role ?? 'CLIENT',
			emailVerified: true,
			subscriptionEndsAt: new Date(Date.now() + 90 * 86_400_000),
			programStartDate: options.programStartDate ?? null,
			programCycleStarts: options.programCycleStarts ?? [],
			nutritionDaysAllocated: options.nutritionDaysAllocated ?? 0
		}
	});
	await prisma.transaction.create({
		data: {
			stripePaymentId: `cs_test_${unique()}`,
			userId: user.id,
			amount: 250,
			currency: 'eur',
			status: 'paid',
			offerSlugs: options.offerSlugs ?? []
		}
	});
	return user;
}

export async function createDailyTask(data: { label?: string; points?: number } = {}) {
	return prisma.dailyTask.create({
		data: { label: data.label ?? `Tâche ${unique()}`, points: data.points ?? 10, active: true }
	});
}

export async function createWorkoutSession(type: Prisma.WorkoutSessionCreateInput['type'] = 'MAIN_A') {
	return prisma.workoutSession.create({ data: { type, name: `Séance ${type}`, active: true } });
}

/** Catalogue de recettes du seed (petits-déjeuners et plats), comme en production. */
export async function seedRecipeCatalog(): Promise<number> {
	const { RECIPE_CATALOG_DEFS } = await import('$lib/server/seed/recipeCatalogDefs.js');
	for (const def of RECIPE_CATALOG_DEFS as Array<Record<string, unknown> & { ingredients: object[] }>) {
		const { ingredients, ...recipe } = def;
		await prisma.recipe.create({
			data: {
				...(recipe as Prisma.RecipeCreateInput),
				active: true,
				isCustom: false,
				ingredients: { create: ingredients as Prisma.RecipeIngredientCreateWithoutRecipeInput[] }
			}
		});
	}
	return RECIPE_CATALOG_DEFS.length;
}

/** Profil nutrition complet (mensuration incluse) : la génération peut calculer les cibles. */
export async function createNutritionProfile(userId: string, options: { breakfastEnabled?: boolean } = {}) {
	await prisma.userProfile.create({
		data: {
			userId,
			activityLevel: 'ACTIVE',
			bodyFatPercent: 25,
			breakfastEnabled: options.breakfastEnabled ?? true,
			allergens: []
		}
	});
	await prisma.bodyMeasurement.create({
		data: { userId, age: 35, heightCm: 178, weightKg: 82, waistCm: 90, chestCm: 100, armCm: 33 }
	});
}
