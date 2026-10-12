/**
 * Zone 6 — Vidéos de l'admin : création, fiche (synchronisation Cloudflare, rattachement à un jour),
 * suppression et purge. Cloudflare est joué par le faux serveur local (e2e/support/fakeExternals.ts).
 * Documentation : docs/app/06-administration.md.
 */
import { stringify } from 'devalue';
import type { Page } from '@playwright/test';
import { test, expect } from './support/test';
import { createSportPlan, createUser, db, loginAs } from './support/db';
import { fakes } from './support/fakes';

const ACTION_HEADERS = { origin: 'http://localhost:4380', 'x-sveltekit-action': 'true' };

type Form = Record<string, string>;

/** Les formulaires vidéo sont en mode `json` de Superforms : tout le contenu voyage dans `__superform_json`. */
const json = (data: Record<string, unknown>): Form => ({ __superform_json: stringify(data) });

async function post(page: Page, url: string, form: Form) {
	const response = await page.request.post(url, { form, headers: ACTION_HEADERS });
	const body = (await response.json()) as { type: string; status?: number; location?: string };
	return { type: body.type, status: body.status ?? response.status(), location: body.location };
}

async function adminPage(page: Page) {
	const admin = await createUser({ role: 'ADMIN' });
	await loginAs(page.context(), admin.id);
	return admin;
}

const workoutCore = { kind: 'workout', isOptional: false, order: 0, category: null };
const discoveryCore = { kind: 'discovery', isOptional: false, sessionType: null, position: null };

test.describe('Vidéos : création', () => {
	test('AD27 · créer une vidéo de séance ou Découverte, avec sa tâche de checklist ; une fiche incomplète est refusée', async ({
		page
	}) => {
		await adminPage(page);
		const create = '/admin/videos/create?/createVideo';

		const incomplete = await post(
			page,
			create,
			json({ ...workoutCore, cloudflareUid: 'cf-w0', title: 'Sans position' })
		);
		expect(incomplete.type).toBe('failure');
		expect(await db.workoutVideo.count()).toBe(0);

		const workout = await post(
			page,
			create,
			json({
				...workoutCore,
				cloudflareUid: 'cf-w1',
				title: 'Séance e2e',
				sessionType: 'MAIN_A',
				position: 'VID1'
			})
		);
		expect(workout.type).toBe('redirect');
		const created = await db.workoutVideo.findFirstOrThrow({ where: { cloudflareUid: 'cf-w1' } });
		expect(created).toMatchObject({
			title: 'Séance e2e',
			sessionType: 'MAIN_A',
			position: 'VID1',
			isOptional: false
		});
		expect(workout.location).toBe(`/admin/videos/workout/${created.id}`);

		const discovery = await post(
			page,
			create,
			json({
				...discoveryCore,
				cloudflareUid: 'cf-d0',
				title: 'Respiration du matin',
				category: 'BREATHWORK',
				order: 1,
				addToChecklist: true,
				checklist: { fromDay: 1, untilDay: 7, points: 15 }
			})
		);
		expect(discovery.type).toBe('redirect');
		const video = await db.discoveryContent.findUniqueOrThrow({
			where: { cloudflareUid: 'cf-d0' }
		});
		expect(video.category).toBe('BREATHWORK');
		expect(
			await db.dailyTask.findFirstOrThrow({ where: { discoveryContentId: video.id } })
		).toMatchObject({ type: 'VIDEO', points: 15, showFromDay: 1, showUntilDay: 7 });

		const inverted = await post(
			page,
			create,
			json({
				...discoveryCore,
				cloudflareUid: 'cf-d1',
				title: 'Jours inversés',
				category: 'MOTIVATION',
				addToChecklist: true,
				checklist: { fromDay: 9, untilDay: 2, points: 15 }
			})
		);
		expect(inverted.type).toBe('failure');
		expect(await db.discoveryContent.count({ where: { cloudflareUid: 'cf-d1' } })).toBe(0);
	});
});

test.describe('Vidéos : fiche', () => {
	test('AD28 · fiche vidéo : synchronisation Cloudflare, modification, rattachement à un jour et détachement', async ({
		page
	}) => {
		await adminPage(page);
		await createSportPlan([{ dayIndex: 1, type: 'MAIN_A' }]);
		const video = await db.discoveryContent.create({
			data: {
				category: 'MOTIVATION',
				title: 'À configurer',
				cloudflareUid: 'cf-fiche',
				status: 'pending'
			}
		});
		await fakes.cloudflare.videos([
			{
				uid: 'cf-fiche',
				meta: { name: 'À configurer' },
				status: { state: 'ready' },
				duration: 90,
				thumbnail: 'https://thumb.test/fiche.jpg'
			}
		]);
		const url = `/admin/videos/discovery/${video.id}`;

		// L'ouverture de la fiche rattrape un webhook manqué.
		await page.goto(url);
		await expect(page.locator('input[name=title]')).toHaveValue('À configurer');
		await expect
			.poll(
				async () =>
					(await db.discoveryContent.findUniqueOrThrow({ where: { id: video.id } })).status
			)
			.toBe('ready');
		expect(
			(await db.discoveryContent.findUniqueOrThrow({ where: { id: video.id } })).durationSeconds
		).toBe(90);

		const core = {
			...discoveryCore,
			cloudflareUid: 'cf-fiche',
			title: 'Méditation guidée',
			category: 'MEDITATION',
			order: 2
		};
		expect((await post(page, `${url}?/updateVideo`, json(core))).type).toBe('success');
		expect(await db.discoveryContent.findUniqueOrThrow({ where: { id: video.id } })).toMatchObject({
			title: 'Méditation guidée',
			category: 'MEDITATION',
			order: 2
		});
		expect((await post(page, `${url}?/updateVideo`, json({ ...core, title: '' }))).type).toBe(
			'failure'
		);

		// Rattachement depuis le formulaire principal, puis depuis son bouton dédié.
		const withAttach = {
			...core,
			attachToProgramDay: true,
			programDayAttach: { dayIndex: 4, type: 'VIDEO_OF_DAY', points: 10 }
		};
		expect((await post(page, `${url}?/updateVideo`, json(withAttach))).type).toBe('success');
		const attached = await db.programDayItem.findMany({ where: { discoveryContentId: video.id } });
		expect(attached).toHaveLength(1);
		expect(attached[0]).toMatchObject({ type: 'VIDEO_OF_DAY', points: 10 });

		expect(
			await post(page, `${url}?/attachToDay`, { dayIndex: '4', type: 'VIDEO_OF_DAY', points: '10' })
		).toMatchObject({ type: 'failure', status: 409 });
		expect(
			(
				await post(page, `${url}?/attachToDay`, {
					dayIndex: '200',
					type: 'VIDEO_OF_DAY',
					points: '10'
				})
			).status
		).toBe(400);
		expect(
			(
				await post(page, `${url}?/attachToDay`, {
					dayIndex: '9',
					type: 'BREATHWORK',
					points: '5',
					label: 'Soir'
				})
			).type
		).toBe('success');
		expect(await db.programDayItem.count({ where: { discoveryContentId: video.id } })).toBe(2);

		expect((await post(page, `${url}?/detachFromDay`, {})).type).toBe('failure');
		expect(
			(await post(page, `${url}?/detachFromDay`, { programDayItemId: attached[0].id })).type
		).toBe('success');
		expect(await db.programDayItem.count({ where: { discoveryContentId: video.id } })).toBe(1);

		// Synchronisation forcée : la durée de Cloudflare est reprise ; une vidéo absente est signalée.
		await fakes.cloudflare.videos([
			{
				uid: 'cf-fiche',
				meta: { name: 'Méditation guidée' },
				status: { state: 'ready' },
				duration: 150
			}
		]);
		expect((await post(page, `${url}?/syncFromCloudflare`, {})).type).toBe('success');
		expect(
			(await db.discoveryContent.findUniqueOrThrow({ where: { id: video.id } })).durationSeconds
		).toBe(150);
		await fakes.cloudflare.videos([]);
		expect(await post(page, `${url}?/syncFromCloudflare`, {})).toMatchObject({
			type: 'failure',
			status: 404
		});
	});

	test('AD29 · fiche d’une vidéo de séance : mise à jour et synchronisation ; une vidéo inconnue répond 404', async ({
		page
	}) => {
		await adminPage(page);
		const plan = await createSportPlan([{ dayIndex: 1, type: 'MAIN_A' }]);
		const id = plan.videos[1].vid1;
		const workout = await db.workoutVideo.findUniqueOrThrow({ where: { id } });
		await fakes.cloudflare.videos([
			{
				uid: workout.cloudflareUid,
				meta: { name: workout.title },
				status: { state: 'ready' },
				duration: 75
			}
		]);
		const url = `/admin/videos/workout/${id}`;

		await page.goto(url);
		await expect(page.locator('input[name=title]')).toHaveValue(workout.title);
		const core = {
			...workoutCore,
			cloudflareUid: workout.cloudflareUid,
			title: 'Séance renommée',
			sessionType: 'MAIN_B',
			position: 'VID2'
		};
		expect((await post(page, `${url}?/updateVideo`, json(core))).type).toBe('success');
		expect(await db.workoutVideo.findUniqueOrThrow({ where: { id } })).toMatchObject({
			title: 'Séance renommée',
			sessionType: 'MAIN_B',
			position: 'VID2'
		});
		expect((await post(page, `${url}?/updateVideo`, json({ ...core, position: null }))).type).toBe(
			'failure'
		);

		expect((await post(page, `${url}?/syncFromCloudflare`, {})).type).toBe('success');
		expect((await db.workoutVideo.findUniqueOrThrow({ where: { id } })).durationSeconds).toBe(75);

		const unknown = await page.goto('/admin/videos/workout/000000000000000000000000');
		expect(unknown?.status()).toBe(404);
	});
});

test.describe('Vidéos : liste', () => {
	test('AD30 · la liste affiche les vidéos ; suppression par identifiant composite ; purge complète', async ({
		page
	}) => {
		await adminPage(page);
		const discovery = await db.discoveryContent.create({
			data: {
				category: 'MINDSET',
				title: 'Mindset à supprimer',
				cloudflareUid: 'cf-del-d',
				status: 'ready'
			}
		});
		const plan = await createSportPlan([{ dayIndex: 1, type: 'MAIN_A' }]);
		const workout = await db.workoutVideo.findUniqueOrThrow({ where: { id: plan.videos[1].vid2 } });

		await page.goto('/admin/videos');
		await expect(page.getByText('Mindset à supprimer')).toBeVisible();
		await expect(page.getByText(workout.title)).toBeVisible();

		expect(
			(await post(page, '/admin/videos?/deleteVideo', { id: 'pas-un-identifiant' })).type
		).toBe('failure');
		expect(
			(await post(page, '/admin/videos?/deleteVideo', { id: `discovery:${discovery.id}` })).type
		).toBe('success');
		expect(await db.discoveryContent.count({ where: { id: discovery.id } })).toBe(0);
		expect(
			(await post(page, '/admin/videos?/deleteVideo', { id: `workout:${workout.id}` })).type
		).toBe('success');
		expect(await db.workoutVideo.count({ where: { id: workout.id } })).toBe(0);

		await post(page, '/admin/videos/sync?/purgeAll', {});
		expect(await db.workoutVideo.count()).toBe(0);
		expect(await db.discoveryContent.count()).toBe(0);
	});

	test('AD31 · les actions vidéo sont refusées à un non-admin', async ({ page, context }) => {
		const client = await createUser();
		await loginAs(context, client.id);
		const video = await db.discoveryContent.create({
			data: { category: 'MOTIVATION', title: 'Protégée', cloudflareUid: 'cf-prot', status: 'ready' }
		});
		const response = await page.request.post('/admin/videos?/deleteVideo', {
			form: { id: `discovery:${video.id}` },
			headers: ACTION_HEADERS
		});
		expect(response.status()).toBe(403);
		expect(await db.discoveryContent.count({ where: { id: video.id } })).toBe(1);
	});
});
