/**
 * Zone 6 — Fiche utilisateur de l'admin : formulaires invalides, confirmations manquantes et compte introuvable.
 * Documentation : docs/app/06-administration.md.
 */
import type { Page } from '@playwright/test';
import { test, expect } from './support/test';
import { createOnboardedUser, createUser, db, loginAs } from './support/db';

const ACTION_HEADERS = { origin: 'http://localhost:4380', 'x-sveltekit-action': 'true' };
const UNKNOWN_ID = '000000000000000000000000';

async function act(page: Page, clientId: string, name: string, form: Record<string, string>) {
	const response = await page.request.post(`/admin/users/${clientId}?/${name}`, {
		form,
		headers: ACTION_HEADERS
	});
	const body = (await response.json()) as { type: string; status?: number; data?: string };
	return { type: body.type, status: body.status ?? response.status(), data: body.data ?? '' };
}

test.describe('Fiche utilisateur : refus', () => {
	test('AD36 · un formulaire sans identifiant est refusé (400) pour chaque action d’édition', async ({
		page,
		context
	}) => {
		const admin = await createUser({ role: 'ADMIN' });
		const client = await createOnboardedUser();
		await loginAs(context, admin.id);

		for (const name of [
			'updateProfile',
			'deleteBodyMeasurement',
			'updateNutritionDay',
			'updateWorkoutDay',
			'upsertDailyTaskCompletion',
			'upsertDailyTaskOptOut',
			'updateVideoProgress',
			'upsertProgramDayItemCompletion',
			'updateUserChallenge',
			'updateUser'
		]) {
			expect(await act(page, client.id, name, {}), name).toMatchObject({
				type: 'failure',
				status: 400
			});
		}
	});

	test('AD37 · profil et mensuration : la régénération du programme doit être confirmée', async ({
		page,
		context
	}) => {
		const admin = await createUser({ role: 'ADMIN' });
		const client = await createOnboardedUser();
		const measurement = await db.bodyMeasurement.findFirstOrThrow({ where: { userId: client.id } });
		await loginAs(context, admin.id);

		const profile = await act(page, client.id, 'updateProfile', {
			id: client.id,
			allergens: 'poisson'
		});
		expect(profile).toMatchObject({ type: 'failure', status: 400 });
		expect(profile.data).toContain('Confirmation de régénération requise');
		expect(
			(await db.userProfile.findUniqueOrThrow({ where: { userId: client.id } })).allergens
		).toEqual([]);

		const deletion = await act(page, client.id, 'deleteBodyMeasurement', { id: measurement.id });
		expect(deletion.data).toContain('Confirmation de régénération requise');
		expect(await db.bodyMeasurement.count({ where: { userId: client.id } })).toBe(1);
	});

	test('AD38 · compte introuvable ou adresse déjà utilisée : refusés sans modification', async ({
		page,
		context
	}) => {
		const admin = await createUser({ role: 'ADMIN' });
		const client = await createOnboardedUser();
		await loginAs(context, admin.id);
		const form = {
			email: 'inconnu@test.local',
			role: 'CLIENT',
			isMfaEnabled: 'false',
			emailVerified: 'false'
		};

		const unknown = await act(page, client.id, 'updateUser', { ...form, id: UNKNOWN_ID });
		expect(unknown).toMatchObject({ type: 'failure', status: 404 });

		const taken = await act(page, client.id, 'updateUser', {
			...form,
			id: client.id,
			email: admin.email
		});
		expect(taken).toMatchObject({ type: 'failure', status: 400 });
		expect((await db.user.findUniqueOrThrow({ where: { id: client.id } })).email).toBe(
			client.email
		);
	});
});
