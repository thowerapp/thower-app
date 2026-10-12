/**
 * Accès direct à la base éphémère des tests e2e : préparation des données et vérifications.
 * Jamais la base du .env (garde-fou `assertE2eDatabase`).
 */
import { randomBytes } from 'node:crypto';
import { hash } from '@node-rs/argon2';
import { PrismaClient, type Role } from '@prisma/client';
import type { BrowserContext } from '@playwright/test';
import Stripe from 'stripe';
import { E2E_BASE_URL, E2E_DATABASE_URL, E2E_STRIPE_WEBHOOK_SECRET, assertE2eDatabase } from './config';
import {
	addDaysCivil,
	civilDateInTimeZone,
	nextMondayStartParis,
	zonedMidnightUtc
} from '../../src/lib/utils/programDay';

assertE2eDatabase(E2E_DATABASE_URL);
export const db = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });

export const DEFAULT_PASSWORD = 'Thower-e2e-2026';

/** Vide toutes les collections (index conservés). */
export async function resetDatabase(): Promise<void> {
	const result = (await db.$runCommandRaw({ listCollections: 1, nameOnly: true })) as {
		cursor?: { firstBatch?: { name: string }[] };
	};
	for (const { name } of result.cursor?.firstBatch ?? []) {
		if (!name.startsWith('system.')) await db.$runCommandRaw({ delete: name, deletes: [{ q: {}, limit: 0 }] });
	}
}

let seq = 0;
export const uniqueEmail = (prefix = 'user') => `${prefix}-${Date.now().toString(36)}-${++seq}@test.local`;

type UserOptions = {
	email?: string;
	role?: Role;
	emailVerified?: boolean;
	/** Transaction payée (offres : vide = les deux) et abonnement de 3 mois. */
	paid?: boolean | { offerSlugs: string[] };
	programStartDate?: Date | null;
};

/** Compte avec mot de passe (même hachage que l'app : argon2id). */
export async function createUser(options: UserOptions = {}) {
	const passwordHash = await hash(DEFAULT_PASSWORD, { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 });
	const paid = options.paid ?? false;
	const user = await db.user.create({
		data: {
			email: options.email ?? uniqueEmail(),
			username: 'Testeur',
			passwordHash,
			role: options.role ?? 'CLIENT',
			emailVerified: options.emailVerified ?? true,
			programStartDate: options.programStartDate ?? null,
			...(paid ? { subscriptionEndsAt: new Date(Date.now() + 90 * 86_400_000) } : {})
		}
	});
	if (paid) {
		await db.transaction.create({
			data: {
				stripePaymentId: `cs_test_${randomBytes(6).toString('hex')}`,
				userId: user.id,
				amount: 500,
				currency: 'eur',
				status: 'paid',
				offerSlugs: paid === true ? [] : paid.offerSlugs,
				nutritionSegmentCreditedAt: new Date()
			}
		});
	}
	return user;
}

/** Connecte un compte dans le navigateur : session Lucia en base + cookie, sans passer par le formulaire. */
export async function loginAs(context: BrowserContext, userId: string): Promise<void> {
	const id = randomBytes(20).toString('hex');
	await db.session.create({
		data: { id, userId, expiresAt: new Date(Date.now() + 30 * 86_400_000), twoFactorVerified: false }
	});
	await context.addCookies([{ name: 'auth_session', value: id, url: E2E_BASE_URL, httpOnly: true, sameSite: 'Lax' }]);
}

/** Dernier code de vérification d'email (aucun email n'est envoyé en e2e). */
export async function latestVerificationCode(userId: string): Promise<string> {
	const request = await db.emailVerificationRequest.findFirst({ where: { userId }, orderBy: { expiresAt: 'desc' } });
	if (!request) throw new Error('Aucune demande de vérification d’email.');
	return request.code;
}

/** En-tête `stripe-signature` valide pour le secret factice : simule un webhook envoyé par Stripe. */
export function signStripeWebhook(payload: string): string {
	return Stripe.webhooks.generateTestHeaderString({ payload, secret: E2E_STRIPE_WEBHOOK_SECRET });
}

/** Départ du programme tel que le jour courant (heure de Paris) soit `dayIndex` (1 = aujourd'hui). */
export function programStartForDay(dayIndex: number, now: Date = new Date()): Date {
	const today = civilDateInTimeZone(now);
	const start = addDaysCivil(today.year, today.month, today.day, 1 - dayIndex);
	return zonedMidnightUtc(start.year, start.month, start.day);
}

/** Lundi (minuit Paris) de la semaine en cours : un programme démarre toujours un lundi. */
export function currentWeekMondayParis(now: Date = new Date()): Date {
	const today = civilDateInTimeZone(now);
	const back = (today.weekday + 6) % 7;
	const monday = addDaysCivil(today.year, today.month, today.day, -back);
	return zonedMidnightUtc(monday.year, monday.month, monday.day);
}

/** Jour du programme aujourd'hui pour un départ le lundi de cette semaine (1 = lundi … 7 = dimanche). */
export function todayIndexFromMonday(now: Date = new Date()): number {
	return ((civilDateInTimeZone(now).weekday + 6) % 7) + 1;
}

type OnboardedOptions = {
	/** Jour courant du programme (défaut 3) ; 0 = démarre dans le futur (lundi prochain). */
	dayIndex?: number;
	/** Départ un lundi, N semaines avant la semaine en cours (0 = ce lundi). Prioritaire sur `dayIndex`. */
	startMondayWeeksAgo?: number;
	offerSlugs?: string[];
	nutritionDaysAllocated?: number;
	role?: Role;
	subscriptionEndsAt?: Date | null;
};

/** Compte prêt pour l'espace utilisateur : payé, profil, mensuration, photos d'inscription, programme démarré. */
export async function createOnboardedUser(options: OnboardedOptions = {}) {
	const dayIndex = options.dayIndex ?? 3;
	const user = await createUser({
		role: options.role,
		paid: options.offerSlugs ? { offerSlugs: options.offerSlugs } : true,
		programStartDate: options.startMondayWeeksAgo !== undefined
			? new Date(currentWeekMondayParis().getTime() - options.startMondayWeeksAgo * 7 * 86_400_000)
			: dayIndex > 0
				? programStartForDay(dayIndex)
				: nextMondayStartParis(new Date(Date.now() + 86_400_000))
	});
	await db.user.update({
		where: { id: user.id },
		data: {
			nutritionDaysAllocated: options.nutritionDaysAllocated ?? 91,
			...(options.subscriptionEndsAt !== undefined ? { subscriptionEndsAt: options.subscriptionEndsAt } : {})
		}
	});
	await db.userProfile.create({
		data: { userId: user.id, activityLevel: 'ACTIVE', bodyFatPercent: 25, breakfastEnabled: true, allergens: [], stressLevel: 5 }
	});
	await db.bodyMeasurement.create({
		data: { userId: user.id, age: 35, heightCm: 178, weightKg: 82, waistCm: 90, chestCm: 100, armCm: 33 }
	});
	for (const angle of ['FRONT', 'SIDE', 'BACK'] as const) {
		await db.progressPhoto.create({ data: { userId: user.id, angle, month: 0, url: `/api/cloudflare/r2/image/photos/${angle}.jpg` } });
	}
	return db.user.findUniqueOrThrow({ where: { id: user.id } });
}

export async function createDailyTask(data: { label: string; points?: number; order?: number; showFromDay?: number; showUntilDay?: number }) {
	return db.dailyTask.create({ data: { points: 10, order: 0, active: true, ...data } });
}

type SportDay = { dayIndex: number; type: 'MAIN_A' | 'MAIN_B' | 'MAIN_C' | 'DISCOVERY'; pre?: boolean };

/**
 * Plan sport : programme actif, séances 1 / 2 / 3 (et Découverte si utilisée), et pour chaque jour
 * deux vidéos obligatoires (VID1, VID2) typées comme l'admin le fait, plus une pré-séance facultative.
 */
export async function createSportPlan(days: SportDay[]) {
	const program = await db.program.create({ data: { active: true } });
	const types = [...new Set(days.map((d) => d.type))];
	const names: Record<SportDay['type'], string> = { MAIN_A: 'Séance 1', MAIN_B: 'Séance 2', MAIN_C: 'Séance 3', DISCOVERY: 'Découverte' };
	const sessions = Object.fromEntries(
		await Promise.all(
			types.map(async (type, order) => [type, await db.workoutSession.create({ data: { type, name: names[type], active: true, order } })])
		)
	) as Record<SportDay['type'], { id: string; name: string }>;

	const videos: Record<number, { pre?: string; vid1: string; vid2: string }> = {};
	for (const day of days) {
		const programDay = await db.programDay.create({ data: { programId: program.id, dayIndex: day.dayIndex } });
		const make = async (position: 'PRE' | 'VID1' | 'VID2', order: number) => {
			const video = await db.workoutVideo.create({
				data: {
					cloudflareUid: `e2e-j${day.dayIndex}-${position.toLowerCase()}-${randomBytes(3).toString('hex')}`,
					title: `J${day.dayIndex} ${position}`,
					position,
					isOptional: position === 'PRE',
					sessionType: day.type,
					status: 'ready',
					durationSeconds: 60
				}
			});
			await db.programDayItem.create({
				data: { programDayId: programDay.id, type: 'SPORT_SESSION', workoutVideoId: video.id, order }
			});
			return video.id;
		};
		videos[day.dayIndex] = {
			...(day.pre ? { pre: await make('PRE', 0) } : {}),
			vid1: await make('VID1', 1),
			vid2: await make('VID2', 2)
		};
	}
	return { program, sessions, videos };
}
