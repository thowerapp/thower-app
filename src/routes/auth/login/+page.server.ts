import { fail, redirect } from '@sveltejs/kit';
import { getUserFromEmail, getUserPasswordHash } from '$lib/lucia/user';
import { RefillingTokenBucket, Throttler } from '$lib/lucia/rate-limit';
import { verifyPasswordHash } from '$lib/lucia/password';
import { auth } from '$lib/lucia';

import type { Actions, PageServerLoadEvent, RequestEvent } from './$types';
import { loginSchema } from '$lib/schema/auth/loginSchema';
import { zod } from '$lib/superforms-zod';
import { message, superValidate } from 'sveltekit-superforms';

function logLogin(...args: unknown[]) {
	console.log('[login]', ...args);
}

export const load = async (event: PageServerLoadEvent) => {
	if (event.locals.session !== null && event.locals.user !== null) {
		if (!event.locals.user.emailVerified) {
			return redirect(302, '/auth/verify-email');
		}

		if (!event.locals.user.googleId || !event.locals.user?.isMfaEnabled) {
			if (!event.locals.user.registered2FA) {
				if (event.locals.user.isMfaEnabled) {
					return redirect(302, '/auth/2fa/setup');
				}
			}
			if (!event.locals.session?.twoFactorVerified) {
				if (event.locals.user.isMfaEnabled) {
					return redirect(302, '/auth/2fa');
				}
			}
		}
		return redirect(302, '/auth/');
	}

	const loginForm = await superValidate(event, zod(loginSchema));

	const reason = event.url.searchParams.get('reason');
	const emailParam = event.url.searchParams.get('email');
	const authNotice =
		reason === 'already_registered'
			? 'Vous etes deja inscrit avec cette adresse e-mail. Connectez-vous ci-dessous.'
			: null;

	if (emailParam && loginSchema.shape.email.safeParse(emailParam).success) {
		loginForm.data.email = emailParam;
	}

	return {
		loginForm,
		authNotice
	};
};

const throttler = new Throttler<string>([0, 1, 2, 4, 8, 16, 30, 60, 180, 300]);
const ipBucket = new RefillingTokenBucket<string>(20, 1);

export const actions: Actions = {
	login: async (event: RequestEvent) => {
		// TODO: Assumes X-Forwarded-For is always included.
		const clientIP = event.request.headers.get('X-Forwarded-For');
		if (clientIP !== null && !ipBucket.check(clientIP, 1)) {
			return fail(429, {
				message: 'Too many requests',
				email: ''
			});
		}

		const form = await superValidate(event, zod(loginSchema));
		const email = form.data.email as string;
		const password = form.data.password as string;

		if (!form.valid) {
			return fail(400, { form });
		}

		const user = await getUserFromEmail(email);

		if (user === null) {
			logLogin('unknown email', email);
			return message(form, "Veuillez creer un compte pour vous authentifier.");
		}

		// Si l'utilisateur possède un googleId, c'est un utilisateur OAuth
		if (user.googleId) {
			return message(form, 'Connectez vous via Google OAuth');
		}

		if (clientIP !== null && !ipBucket.consume(clientIP, 1)) {
			return message(form, 'Too many requests');
		}
		if (!throttler.consume(user.id)) {
			return message(form, 'Too many requests');
		}
		const passwordHash = await getUserPasswordHash(user.id ?? undefined, email);
		if (passwordHash === null) {
			return message(form, 'Invalid password');
		}
		const validPassword = await verifyPasswordHash(passwordHash, password);
		if (!validPassword) {
			return message(form, 'Invalid password');
		}
		throttler.reset(user.id);

		const session = await auth.createSession(user.id, { twoFactorVerified: false });
		const sessionCookie = auth.createSessionCookie(session.id);
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '/',
			...sessionCookie.attributes
		});
		logLogin('session created', { userId: user.id, sessionId: session.id });

		if (!user.emailVerified) {
			throw redirect(302, '/auth/verify-email');
		}

		if (!user.registered2FA && user.isMfaEnabled) {
			throw redirect(302, '/auth/2fa/setup');
		}

		if (user.isMfaEnabled) {
			throw redirect(302, '/auth/2fa');
		}

		throw redirect(302, '/auth');
	}
};
