import type { Role } from '@prisma/client';
import type { Session as LuciaSession, User as LuciaUser } from 'lucia';
import type { Session } from './session';
import type { UserForClient } from './user';

/** Projette la session et l'utilisateur validés par Lucia (une seule lecture) vers `event.locals`. */
export function toLocalsAuth(
	luciaUser: LuciaUser,
	luciaSession: LuciaSession
): { user: UserForClient; session: Session } {
	return {
		user: {
			id: luciaUser.id,
			email: luciaUser.email,
			username: luciaUser.username,
			emailVerified: luciaUser.emailVerified,
			registered2FA: luciaUser.registered2FA,
			googleId: luciaUser.googleId,
			name: luciaUser.name,
			picture: luciaUser.picture,
			role: luciaUser.role as Role,
			isMfaEnabled: luciaUser.isMfaEnabled,
			subscriptionEndsAt: luciaUser.subscriptionEndsAt
		},
		session: {
			id: luciaSession.id,
			userId: luciaSession.userId,
			expiresAt: luciaSession.expiresAt,
			twoFactorVerified: luciaSession.twoFactorVerified,
			oauthProvider: luciaSession.oauthProvider ?? null,
			fresh: luciaSession.fresh
		}
	};
}
