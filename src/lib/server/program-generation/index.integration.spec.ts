import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '$lib/server';
import {
	createNutritionProfile,
	createPaidUser,
	seedRecipeCatalog
} from '$lib/server/testing/integration/db';
import { generateProgramForUser } from './generateProgramForUser';
import { scheduleProgramGenerationAfterPayment } from './index';

vi.mock('./generateProgramForUser', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./generateProgramForUser')>();
	return { ...actual, generateProgramForUser: vi.fn(actual.generateProgramForUser) };
});

describe('scheduleProgramGenerationAfterPayment (base réelle)', () => {
	beforeEach(() => {
		vi.spyOn(console, 'log').mockImplementation(() => undefined);
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
	});

	it('refuse sans paiement valide : rien n’est généré', async () => {
		const user = await prisma.user.create({
			data: { email: 'sans-paiement@test.local', emailVerified: true }
		});
		await scheduleProgramGenerationAfterPayment(user.id);
		expect(await prisma.nutritionDay.count()).toBe(0);
		expect(
			(await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).programStartDate
		).toBeNull();
	});

	it('offre sport seule : fixe le départ du programme sans générer de nutrition', async () => {
		const user = await createPaidUser({ offerSlugs: ['sport'] });
		await scheduleProgramGenerationAfterPayment(user.id, { role: 'CLIENT' });
		expect(await prisma.nutritionDay.count()).toBe(0);
		const saved = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
		expect(saved.programStartDate).not.toBeNull();
		expect(saved.programGenStatus).toBe('DONE');

		await scheduleProgramGenerationAfterPayment(user.id);
		expect(
			(await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).programStartDate
		).toEqual(saved.programStartDate);
	});

	it('ne démarre pas une seconde génération tant que la première est en cours', async () => {
		const user = await createPaidUser({ nutritionDaysAllocated: 91 });
		await prisma.user.update({
			where: { id: user.id },
			data: { programGenStatus: 'RUNNING', programGenStartedAt: new Date() }
		});
		await scheduleProgramGenerationAfterPayment(user.id);
		expect(await prisma.nutritionDay.count()).toBe(0);
		expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).programGenStatus).toBe(
			'RUNNING'
		);
	});

	it('génère le planning et la liste de courses, puis recale sans rien dupliquer, puis rattrape une liste manquante', async () => {
		await seedRecipeCatalog();
		const user = await createPaidUser({ nutritionDaysAllocated: 91 });
		await createNutritionProfile(user.id);

		await scheduleProgramGenerationAfterPayment(user.id, { source: 'internal' });
		let saved = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
		expect(await prisma.nutritionDay.count({ where: { userId: user.id } })).toBe(91);
		expect(saved).toMatchObject({ programGenStatus: 'DONE' });
		expect(saved.programStartDate).not.toBeNull();
		expect(await prisma.shoppingList.count({ where: { userId: user.id } })).toBeGreaterThan(0);

		await scheduleProgramGenerationAfterPayment(user.id);
		expect(await prisma.nutritionDay.count({ where: { userId: user.id } })).toBe(91);
		expect(await prisma.meal.count()).toBe(273);

		await prisma.shoppingList.deleteMany({ where: { userId: user.id } });
		await scheduleProgramGenerationAfterPayment(user.id);
		expect(await prisma.shoppingList.count({ where: { userId: user.id } })).toBeGreaterThan(0);
		saved = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
		expect(saved.programGenStatus).toBe('DONE');
	});

	it('un administrateur sans allocation reçoit 91 jours de nutrition', async () => {
		await seedRecipeCatalog();
		const admin = await createPaidUser({ role: 'ADMIN' });
		await prisma.transaction.deleteMany({ where: { userId: admin.id } });
		await createNutritionProfile(admin.id);

		await scheduleProgramGenerationAfterPayment(admin.id);
		expect(
			(await prisma.user.findUniqueOrThrow({ where: { id: admin.id } })).nutritionDaysAllocated
		).toBe(91);
		expect(await prisma.nutritionDay.count({ where: { userId: admin.id } })).toBe(91);
	});

	it('marque la génération en échec quand elle plante, puis relance l’erreur', async () => {
		const user = await createPaidUser({ nutritionDaysAllocated: 91 });
		vi.mocked(generateProgramForUser).mockRejectedValueOnce(new Error('base indisponible'));
		await expect(scheduleProgramGenerationAfterPayment(user.id)).rejects.toThrow(
			'base indisponible'
		);
		expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).programGenStatus).toBe(
			'FAILED'
		);
	});
});
