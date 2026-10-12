import { ObjectId } from 'mongodb'; // Import ObjectId pour MongoDB
import type { RequestEvent } from '@sveltejs/kit';
import {
	createSessionInDB,
	deleteSession,
	deleteSessionsByUserId,
	verifyTwoFactorForSession
} from '$lib/prisma/session/sessions';
import { auth } from '.';

export interface SessionFlags {
	twoFactorVerified: boolean;
}

export interface Session extends SessionFlags {
	id: string;
	expiresAt: Date;
	userId: string;
	oauthProvider: string | null;
	fresh?: boolean;
}

// Génère un token de session (identifiant MongoDB valide)
export function generateSessionToken(): string {
	return new ObjectId().toString(); // Génère un ObjectId valide
}

export async function createSession(
	token: string,
	userId: string,
	flags: SessionFlags,
	oauthProvider?: string | null
): Promise<Session> {
	if (!ObjectId.isValid(userId)) {
		throw new Error('Invalid user ID format');
	}

	const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

	try {
		const session = await createSessionInDB({
			id: token,
			userId,
			expiresAt,
			twoFactorVerified: flags.twoFactorVerified,
			oauthProvider: oauthProvider ?? null
		});

		return {
			...session,
			oauthProvider: session.oauthProvider
		};
	} catch (error) {
		console.error('Erreur lors de la création de la session :', error);
		throw new Error('Erreur lors de la création de la session.');
	}
}

// Invalide une session spécifique
export async function invalidateSession(sessionId: string): Promise<void> {
	try {
		await deleteSession(sessionId);
	} catch (error: unknown) {
		if (error instanceof Error) {
			console.warn("Erreur lors de l'invalidation de la session :", error.message);
		} else {
			console.warn("Erreur inconnue lors de l'invalidation de la session :", error);
		}
	}
}

// Invalide toutes les sessions d'un utilisateur
export async function invalidateUserSessions(userId: string): Promise<void> {
	if (!ObjectId.isValid(userId)) {
		throw new Error('Invalid user ID format');
	}

	try {
		await deleteSessionsByUserId(userId);
	} catch (error: unknown) {
		if (error instanceof Error) {
			console.warn("Erreur lors de l'invalidation des sessions de l'utilisateur :", error.message);
		} else {
			console.warn(
				"Erreur inconnue lors de l'invalidation des sessions de l'utilisateur : ",
				error
			);
		}
	}
}

// Définit le cookie du token de session
export function setSessionTokenCookie(event: RequestEvent, token: string, expiresAt: Date): void {
	event.cookies.set(
		auth.sessionCookieName, // ✅ même nom que Lucia
		token,
		{
			httpOnly: true,
			path: '/',
			secure: import.meta.env.PROD,
			sameSite: 'lax',
			expires: expiresAt
		}
	);
}
// Supprime le cookie du token de session
export function deleteSessionTokenCookie(event: RequestEvent): void {
	event.cookies.set(
		auth.sessionCookieName, // ✅
		'',
		{
			httpOnly: true,
			path: '/',
			secure: import.meta.env.PROD,
			sameSite: 'lax',
			maxAge: -1
		}
	);
}

// Marque la session comme vérifiée pour la 2FA
export async function setSessionAs2FAVerified(sessionId: string): Promise<void> {
	await verifyTwoFactorForSession(sessionId);
}
