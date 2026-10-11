// -----------------------------------------------------------------------------
// src/lib/server/lucia.ts  – Initialisation Lucia v3 + Prisma adapter
// -----------------------------------------------------------------------------

import { Lucia } from 'lucia';
import { PrismaAdapter } from '@lucia-auth/adapter-prisma';
import { prisma } from '$lib/server';
import { dev } from '$app/environment';

/* Le PrismaAdapter attend les *modèles* Prisma à utiliser */
const adapter = new PrismaAdapter(prisma.session, prisma.user);

export const auth = new Lucia(adapter, {

	/* Cookies de session “rolling” */
	sessionCookie: {
		attributes: {
			secure: !dev,
			sameSite: 'lax',
			path: '/'
		}
	},

	/* Mapping → données sérialisées côté client */
	getUserAttributes: (dbUser) => ({
		userId: dbUser.id,
		email: dbUser.email,
		username: dbUser.username,
		role: dbUser.role,
		isMfaEnabled: dbUser.isMfaEnabled,
		emailVerified: dbUser.emailVerified,
		registered2FA: dbUser.totpKey !== null,
		googleId: dbUser.googleId,
		name: dbUser.name,
		picture: dbUser.picture,
		subscriptionEndsAt: dbUser.subscriptionEndsAt
	}),

	/* Évite de relire la session en base pour ces champs à chaque requête */
	getSessionAttributes: (dbSession) => ({
		twoFactorVerified: dbSession.twoFactorVerified,
		oauthProvider: dbSession.oauthProvider ?? null
	})
});

/* ---------------------- Déclarations globales Lucia ------------------------ */
declare module 'lucia' {
	interface Register {
		Lucia: typeof auth;
		DatabaseUserAttributes: {
			id: string;
			email: string;
			username: string | null;
			role: string;
			isMfaEnabled: boolean;
			emailVerified: boolean;
			totpKey: Uint8Array | null;
			googleId: string | null;
			name: string | null;
			picture: string | null;
			subscriptionEndsAt: Date | null;
		};
		DatabaseSessionAttributes: {
			twoFactorVerified: boolean;
			oauthProvider?: string | null;
		};
	}
}

export type Auth = typeof auth;
