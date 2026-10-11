import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '$lib/server';
import {
	countQueries,
	createNutritionProfile,
	createPaidUser,
	seedRecipeCatalog
} from '$lib/server/testing/integration/db';
import { generateNutritionDaysForUser } from './generateNutrition91Days';

/** Requêtes d'écriture parmi celles journalisées par Prisma (MongoDB). */
const isWrite = (q: string) => /insert|update|delete|createMany|findAndModify/i.test(q);

describe('generateNutritionDaysForUser (base réelle)', () => {
	beforeEach(async () => {
		await seedRecipeCatalog();
	});

	it('génère 91 jours de 3 repas, en peu d’écritures, sans doublon', async () => {
		const user = await createPaidUser({ nutritionDaysAllocated: 91 });
		await createNutritionProfile(user.id, { breakfastEnabled: false });

		const { queries } = await countQueries(() => generateNutritionDaysForUser(user.id, 91));

		const days = await prisma.nutritionDay.findMany({ where: { userId: user.id }, include: { meals: true } });
		expect(days).toHaveLength(91);
		expect(new Set(days.map((d) => d.dayIndex)).size).toBe(91);
		expect(days.every((d) => d.meals.length === 3)).toBe(true);
		// 3 repas par jour même sans petit-déjeuner activé (le jeûne le masque à l'affichage).
		expect(days.every((d) => d.meals.some((m) => m.position === 'BREAKFAST'))).toBe(true);
		// Écriture par lots : quelques requêtes, pas une par repas (~550 avant l'optimisation).
		expect(queries.filter(isWrite).length).toBeLessThanOrEqual(10);
	});

	it('idempotent : une seconde exécution n’écrit rien', async () => {
		const user = await createPaidUser({ nutritionDaysAllocated: 91 });
		await createNutritionProfile(user.id);
		await generateNutritionDaysForUser(user.id, 91);

		const { queries } = await countQueries(() => generateNutritionDaysForUser(user.id, 91));

		expect(queries.filter(isWrite)).toHaveLength(0);
		expect(await prisma.meal.count()).toBe(273);
	});

	it('complète un planning interrompu et prolonge au cycle 2 (jours 92..182)', async () => {
		const user = await createPaidUser({ nutritionDaysAllocated: 182 });
		await createNutritionProfile(user.id);
		await generateNutritionDaysForUser(user.id, 91);
		// Interruption simulée : un jour perd ses repas.
		const day10 = await prisma.nutritionDay.findFirst({ where: { userId: user.id, dayIndex: 10 } });
		await prisma.meal.deleteMany({ where: { nutritionDayId: day10!.id } });

		await generateNutritionDaysForUser(user.id, 182);

		const days = await prisma.nutritionDay.findMany({ where: { userId: user.id }, include: { meals: true } });
		expect(days).toHaveLength(182);
		expect(days.find((d) => d.dayIndex === 10)?.meals).toHaveLength(3);
		expect(Math.max(...days.map((d) => d.dayIndex))).toBe(182);
	});

	it('relit à l’identique les champs composites écrits par createMany', async () => {
		const user = await createPaidUser({ nutritionDaysAllocated: 7 });
		await createNutritionProfile(user.id);
		await generateNutritionDaysForUser(user.id, 7);

		const meals = await prisma.meal.findMany({ select: { complements: true, ingredientGrams: true } });
		const withComposite = meals.filter((m) => m.complements.length > 0 || m.ingredientGrams.length > 0);
		expect(withComposite.length).toBeGreaterThan(0);
		for (const m of withComposite) {
			for (const c of [...m.complements, ...m.ingredientGrams]) {
				expect(typeof c.name).toBe('string');
				expect(Number.isFinite(c.grams)).toBe(true);
			}
		}
	});
});
