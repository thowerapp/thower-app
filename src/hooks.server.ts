// -----------------------------------------------------------------------------
// hooks.server.ts — Rate-limit + Auth + DevTools + Email guards
// -----------------------------------------------------------------------------

import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { redirect } from '@sveltejs/kit';

import { RefillingTokenBucket } from '$lib/lucia/rate-limit';
import { auth } from '$lib/lucia';
import type { User } from '$lib/lucia/user';
import type { Session } from '$lib/lucia/session';

import { getUserByIdPrisma } from '$lib/prisma/user/user';
import { findSessionById } from '$lib/prisma/session/sessions';

/* -------------------------------------------------------------------------- */
/*  Debug & Logging                                                           */
/* -------------------------------------------------------------------------- */

const DEBUG = false; // Constante pour activer/désactiver le logging détaillé

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

function formatTimestamp(): string {
	return new Date().toISOString();
}

function log(level: LogLevel, context: string, ...args: unknown[]) {
	if (!DEBUG && level === 'DEBUG') return;
	
	const timestamp = formatTimestamp();
	const prefix = `[${timestamp}] [${level}] [${context}]`;
	
	switch (level) {
		case 'ERROR':
			console.error(prefix, ...args);
			break;
		case 'WARN':
			console.warn(prefix, ...args);
			break;
		case 'INFO':
			console.info(prefix, ...args);
			break;
		case 'DEBUG':
			console.debug(prefix, ...args);
			break;
	}
}

/* -------------------------------------------------------------------------- */
/*  Utils                                                                     */
/* -------------------------------------------------------------------------- */

const bucket = new RefillingTokenBucket<string>(100, 1); // 100 req / 1 s

function clientIP(event: Parameters<Handle>[0]['event']): string {
	const xff = event.request.headers.get('x-forwarded-for');
	if (xff) return xff.split(',')[0]!.trim();
	try {
		return event.getClientAddress();
	} catch {
		return '127.0.0.1';
	}
}

/* -------------------------------------------------------------------------- */
/*  Guards                                                                    */
/* -------------------------------------------------------------------------- */

const devtoolsGuard: Handle = async ({ event, resolve }) => {
	log('DEBUG', 'DevTools', 'Checking path:', event.url.pathname);
	if (event.url.pathname.startsWith('/.well-known/appspecific/')) {
		log('INFO', 'DevTools', 'Blocked access to DevTools');
		return new Response(null, { status: 204 });
	}
	return resolve(event);
};

const rateLimit: Handle = async ({ event, resolve }) => {
	const ip = clientIP(event);
	log('DEBUG', 'RateLimit', 'Checking IP:', ip);
	if (!bucket.consume(ip, 1)) {
		log('WARN', 'RateLimit', 'Rate limit exceeded for IP:', ip);
		return new Response('Too many requests', { status: 429 });
	}
	return resolve(event);
};

const cookieGuard: Handle = async ({ event, resolve }) => {
	const cookie = event.request.headers.get('cookie') ?? '';
	log('DEBUG', 'CookieGuard', 'Checking cookie header');
	if (/[^\u0020-\u007E]/.test(cookie)) {
		log('WARN', 'CookieGuard', 'Invalid characters in cookie header');
		return new Response('Bad Cookie', { status: 400 });
	}
	return resolve(event);
};

/* -------------------------------------------------------------------------- */
/*  Auth (Lucia v3)                                                           */
/* -------------------------------------------------------------------------- */

const authHandle: Handle = async ({ event, resolve }) => {
	log('DEBUG', 'Auth', 'Starting authentication process');
	log('DEBUG', 'Auth', 'Request URL:', event.url.pathname);
	
	/* 1. Extraction du cookie session */
	const sid = event.cookies.get(auth.sessionCookieName);
	log('DEBUG', 'Auth', 'Session ID from cookie:', sid);
	log('DEBUG', 'Auth', 'All cookies:', event.request.headers.get('cookie'));

	let session: Session | null = null;
	let user: User | null = null;

	if (sid) {
		try {
			log('DEBUG', 'Auth', 'Validating session with ID:', sid);
			const res = await auth.validateSession(sid);
			log('DEBUG', 'Auth', 'Session validation result:', res);
			
			const luciaSession = res.session;
			const luciaUser = res.user;

			log('DEBUG', 'Auth', 'Lucia session object:', luciaSession);
			log('DEBUG', 'Auth', 'Lucia user object:', luciaUser);

			/* Rafraîchissement des données utilisateur */
			if (luciaUser) {
				try {
					log('DEBUG', 'Auth', 'Fetching fresh user data for ID:', luciaUser.id);
					const freshUser = await getUserByIdPrisma(luciaUser.id);
					log('DEBUG', 'Auth', 'Fresh user data:', freshUser);

					if (freshUser) {
						const registered2FA = freshUser.totpKey !== null;
						log('DEBUG', 'Auth', 'User 2FA status:', {
							registered2FA,
							totpKey: !!freshUser.totpKey
						});

						// Ne pas inclure totpKey (Buffer) pour que l'objet soit sérialisable vers le client
						user = {
							id: freshUser.id,
							email: freshUser.email,
							username: freshUser.username,
							emailVerified: freshUser.emailVerified,
							registered2FA,
							googleId: freshUser.googleId,
							name: freshUser.name,
							picture: freshUser.picture,
							role: freshUser.role,
							isMfaEnabled: freshUser.isMfaEnabled
						};
						log('DEBUG', 'Auth', 'Mapped user object:', user);
					} else {
						log('WARN', 'Auth', 'No fresh user data found for ID:', luciaUser.id);
					}
				} catch (error) {
					log('ERROR', 'Auth', 'Error fetching fresh user data:', error);
					// Ne pas faire échouer l'authentification si la récupération de données utilisateur échoue
					// Forcer la déconnexion pour éviter des états incohérents
					log('WARN', 'Auth', 'Forcing logout due to user data fetch error');
					const blank = auth.createBlankSessionCookie();
					event.cookies.set(blank.name, blank.value, { path: '/', ...blank.attributes });
					user = null;
					session = null;
				}
			}

			/* Rafraîchissement des données de session */
			if (luciaSession) {
				try {
					log('DEBUG', 'Auth', 'Fetching session data for ID:', luciaSession.id);
					const dbSession = await findSessionById(luciaSession.id);
					log('DEBUG', 'Auth', 'Database session data:', dbSession);

					if (dbSession) {
						session = {
							id: dbSession.id,
							userId: dbSession.userId,
							expiresAt: dbSession.expiresAt,
							twoFactorVerified: dbSession.twoFactorVerified,
							oauthProvider: dbSession.oauthProvider,
							fresh: luciaSession.fresh
						};
						log('DEBUG', 'Auth', 'Mapped session object:', session);
					} else {
						log('WARN', 'Auth', 'No session found in database for ID:', luciaSession.id);
					}
				} catch (error) {
					log('ERROR', 'Auth', 'Error fetching session data:', error);
				}
			}
		} catch (error) {
			log('ERROR', 'Auth', 'Session validation error:', error);
			const blank = auth.createBlankSessionCookie();
			event.cookies.set(blank.name, blank.value, { path: '/', ...blank.attributes });
			log('INFO', 'Auth', 'Session invalidated, blank cookie set');
		}
	} else {
		log('DEBUG', 'Auth', 'No session ID found in cookies');
	}

	/* 2. Enrichissement de locals */
	log('DEBUG', 'Auth', 'Enriching event.locals');

	event.locals = {
		...event.locals,
		session,
		user,
		role: user?.role ?? null,
		isMfaEnabled: user?.isMfaEnabled ?? false,
		registered2FA: user?.registered2FA ?? false
	};

	log('DEBUG', 'Auth', 'Final event.locals:', {
		session: event.locals.session,
		user: event.locals.user,
		role: event.locals.role,
		isMfaEnabled: event.locals.isMfaEnabled,
		registered2FA: event.locals.registered2FA,
	});

	/* 3. Redirections MFA */
	if (user && user.isMfaEnabled) {
		log('DEBUG', 'Auth', 'Checking MFA requirements for user:', user.id);
		
		if (!user.registered2FA) {
			log('INFO', 'Auth', 'User needs 2FA setup, redirecting to /auth/2fa/setup');
			if (!event.url.pathname.startsWith('/auth/2fa/setup')) {
				throw redirect(302, '/auth/2fa/setup');
			}
		} else if (session && !session.twoFactorVerified) {
			log('INFO', 'Auth', 'User needs 2FA verification, redirecting to /auth/2fa');
			if (!event.url.pathname.startsWith('/auth/2fa')) {
				throw redirect(302, '/auth/2fa');
			}
		}
	}

	log('DEBUG', 'Auth', 'Authentication process completed successfully');
	return resolve(event);
};

/* -------------------------------------------------------------------------- */
/*  Chaîne finale                                                             */
/* -------------------------------------------------------------------------- */

export const handle: Handle = sequence(devtoolsGuard, cookieGuard, rateLimit, authHandle);
