import {
	createEmailVerificationRequest,
	sendVerificationEmail,
	sendVerificationEmailBucket,
	setEmailVerificationRequestCookie
} from '$lib/lucia/email-verification';
import { fail, redirect } from '@sveltejs/kit';
import { checkEmailAvailability } from '$lib/prisma/email/email';
import { verifyPasswordHash } from '$lib/lucia/password';
import { getUserPasswordHash, updateUserPassword } from '$lib/lucia/user';
import {
	createSession,
	generateSessionToken,
	invalidateUserSessions,
	setSessionTokenCookie
} from '$lib/lucia/session';
import { ExpiringTokenBucket } from '$lib/lucia/rate-limit';
import { message, superValidate } from 'sveltekit-superforms';
import { emailSchema, passwordSchema } from '$lib/schema/auth/settingsSchemas';
import { zod } from '$lib/superforms-zod';
import type { SessionFlags } from '$lib/lucia/session';
import { isMfaEnabledSchema } from '$lib/schema/users/MfaEnabledSchema';
import { getUserMFA, updateUserMFA } from '$lib/prisma/user/user';

import type { Actions, PageServerLoadEvent } from './$types';

const passwordUpdateBucket = new ExpiringTokenBucket<string>(5, 60 * 30);

export const load = async (event: PageServerLoadEvent) => {
	if (event.locals.session === null || event.locals.user === null) {
		return redirect(302, '/auth/login');
	}
	if (!event.locals.user.emailVerified) {
		return redirect(302, '/auth/verify-email');
	}

	if (!event.locals.user.googleId) {
		if (event.locals.user.isMfaEnabled) {
			if (!event.locals.user.registered2FA) {
				return redirect(302, '/auth/2fa/setup');
			}
			if (!event.locals.session.twoFactorVerified) {
				return redirect(302, '/auth/2fa');
			}
		}
	}

	const passwordForm = await superValidate(event, zod(passwordSchema));
	const emailForm = await superValidate(event, zod(emailSchema));
	const isMfaEnabledForm = await superValidate(
		{ isMfaEnabled: event.locals.user.isMfaEnabled },
		zod(isMfaEnabledSchema)
	);

	return {
		user: event.locals.user,
		passwordForm,
		emailForm,
		isMfaEnabledForm
	};
};

export const actions: Actions = {
	password: async (event) => {
		const form = await superValidate(event, zod(passwordSchema));
		if (event.locals.session === null || event.locals.user === null) {
			return message(form, 'Session expirée : reconnectez-vous.', { status: 401 });
		}
		if (
			event.locals.user.isMfaEnabled &&
			event.locals.user.registered2FA &&
			!event.locals.session.twoFactorVerified
		) {
			return message(form, 'Action non autorisée.', { status: 403 });
		}
		if (!passwordUpdateBucket.check(event.locals.session.id, 1)) {
			return message(form, 'Trop de tentatives, réessayez dans quelques minutes.', { status: 429 });
		}
		if (!form.valid) return fail(400, { form });
		const password = form.data.password as string;
		const new_password = form.data.new_password as string;
		const passwordHash = await getUserPasswordHash(event.locals.user.id);
		if (!passwordHash) {
			return message(form, 'Impossible de modifier le mot de passe de ce compte.', { status: 400 });
		}
		const validPassword = await verifyPasswordHash(passwordHash, password);
		if (!validPassword) {
			return message(form, 'Mot de passe actuel incorrect.', { status: 400 });
		}
		passwordUpdateBucket.reset(event.locals.session.id);
		await invalidateUserSessions(event.locals.user.id);
		await updateUserPassword(event.locals.user.id, new_password);
		const sessionToken = generateSessionToken();
		const sessionFlags: SessionFlags = {
			twoFactorVerified: event.locals.session.twoFactorVerified
		};
		const session = await createSession(sessionToken, event.locals.user.id, sessionFlags);
		setSessionTokenCookie(event, sessionToken, session.expiresAt);
		return message(form, 'Mot de passe modifié.');
	},

	email: async (event) => {
		const form = await superValidate(event, zod(emailSchema));
		if (event.locals.session === null || event.locals.user === null) {
			return message(form, 'Session expirée : reconnectez-vous.', { status: 401 });
		}
		if (
			event.locals.user.isMfaEnabled &&
			event.locals.user.registered2FA &&
			!event.locals.session.twoFactorVerified
		) {
			return message(form, 'Action non autorisée.', { status: 403 });
		}
		if (!sendVerificationEmailBucket.check(event.locals.user.id, 1)) {
			return message(form, 'Trop de tentatives, réessayez dans quelques minutes.', { status: 429 });
		}
		if (!form.valid) return fail(400, { form });
		const email = form.data.email as string;
		const emailAvailable = await checkEmailAvailability(email);
		if (!emailAvailable) {
			return message(form, 'Cet email est déjà utilisé.', { status: 400 });
		}
		const verificationRequest = await createEmailVerificationRequest(event.locals.user.id, email);
		try {
			await sendVerificationEmail(verificationRequest.email, verificationRequest.code);
		} catch (err) {
			console.error('[auth/account] envoi du code de vérification', err);
			return message(form, 'L’envoi de l’email a échoué, réessayez.', { status: 500 });
		}
		setEmailVerificationRequestCookie(event, verificationRequest);
		redirect(302, '/auth/verify-email');
	},

	isMfaEnabled: async (event) => {
		const form = await superValidate(event, zod(isMfaEnabledSchema));
		if (!event.locals.user) return message(form, 'Session expirée : reconnectez-vous.', { status: 401 });
		if (!form.valid) return fail(400, { form });
		const currentStatus = await getUserMFA(event.locals.user.id);
		const newMfaStatus = !(currentStatus?.isMfaEnabled ?? false);
		await updateUserMFA(event.locals.user.id, { isMfaEnabled: newMfaStatus });
		return message(form, { text: 'Double authentification modifiée', newStatus: newMfaStatus });
	}
};
