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
