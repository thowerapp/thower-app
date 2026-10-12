// -----------------------------------------------------------------------------
// hooks.server.ts — Rate-limit + Auth + DevTools + Email guards
// -----------------------------------------------------------------------------

import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { redirect } from '@sveltejs/kit';
import { getHasValidPaymentByUserId } from '$lib/prisma/transaction/getHasValidPaymentByUserId';

import { RefillingTokenBucket } from '$lib/lucia/rate-limit';
import { auth } from '$lib/lucia';
import type { UserForClient } from '$lib/lucia/user';
import { toLocalsAuth } from '$lib/lucia/locals';
import type { Session } from '$lib/lucia/session';


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
	let user: UserForClient | null = null;

	if (sid) {
		try {
			log('DEBUG', 'Auth', 'Validating session with ID:', sid);
			const res = await auth.validateSession(sid);
			log('DEBUG', 'Auth', 'Session validation result:', res);

			const luciaSession = res.session;
			const luciaUser = res.user;

			log('DEBUG', 'Auth', 'Lucia session object:', luciaSession);
			log('DEBUG', 'Auth', 'Lucia user object:', luciaUser);

			// Lucia lit déjà session et utilisateur en base à chaque requête : pas de seconde lecture.
			if (luciaUser && luciaSession) {
				({ user, session } = toLocalsAuth(luciaUser, luciaSession));
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
		registered2FA: event.locals.registered2FA
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
/*  Admin : les actions de formulaire et les API n'exécutent pas le layout     */
/* -------------------------------------------------------------------------- */

const adminWriteGuard: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	const isAdminArea =
		pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin/');
	const isRead = event.request.method === 'GET' || event.request.method === 'HEAD';
	if (isAdminArea && !isRead && event.locals.role !== 'ADMIN') {
		log('WARN', 'AdminGuard', 'Blocked non-admin write on', pathname);
		return new Response('Forbidden', { status: 403 });
	}
	return resolve(event);
};

/* -------------------------------------------------------------------------- */
/*  Espace utilisateur et API vidéo : les actions n'exécutent pas le layout   */
/* -------------------------------------------------------------------------- */

const userWriteGuard: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	const isUserArea = pathname === '/user' || pathname.startsWith('/user/');
	const isRead = event.request.method === 'GET' || event.request.method === 'HEAD';
	// Les API vidéo (jeton de lecture, progression, points) servent le contenu payant, lecture comprise.
	const isVideoApi = pathname.startsWith('/api/videos/');
	if ((isUserArea && !isRead) || isVideoApi) {
		if (!event.locals.user) return new Response('Unauthorized', { status: 401 });
		// Accès valide = paiement et abonnement non expiré (l'admin est dispensé), comme pour les pages.
		if (event.locals.role !== 'ADMIN' && !(await getHasValidPaymentByUserId(event.locals.user.id))) {
			log('WARN', 'UserGuard', 'Blocked write without valid access on', pathname);
			return new Response('Forbidden', { status: 403 });
		}
	}
	return resolve(event);
};

/* -------------------------------------------------------------------------- */
/*  Chaîne finale                                                             */
/* -------------------------------------------------------------------------- */

export const handle: Handle = sequence(
	devtoolsGuard,
	cookieGuard,
	rateLimit,
	authHandle,
	adminWriteGuard,
	userWriteGuard
);
