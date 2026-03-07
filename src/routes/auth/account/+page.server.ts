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
		if (event.locals.session === null || event.locals.user === null) {
			return fail(401, { form: { message: 'Not authenticated' } });
		}
		if (
			event.locals.user.isMfaEnabled &&
			event.locals.user.registered2FA &&
			!event.locals.session.twoFactorVerified
		) {
			return fail(403, { form: { message: 'Forbidden' } });
		}
		if (!passwordUpdateBucket.check(event.locals.session.id, 1)) {
			return fail(429, { form: { message: 'Too many requests' } });
		}
		const form = await superValidate(event, zod(passwordSchema));
		if (!form.valid) return fail(400, { form });
		const password = form.data.password as string;
		const new_password = form.data.new_password as string;
		const passwordHash = await getUserPasswordHash(event.locals.user.id);
		if (!passwordHash) {
			return fail(400, { form: { message: 'Cannot change password', form } });
		}
		const validPassword = await verifyPasswordHash(passwordHash, password);
		if (!validPassword) {
			return fail(400, { form: { message: 'Incorrect password', form } });
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
		return message(form, 'Password modified successfully');
	},

	email: async (event) => {
		if (event.locals.session === null || event.locals.user === null) {
			return fail(401, { form: { message: 'Not authenticated' } });
		}
		if (
			event.locals.user.isMfaEnabled &&
			event.locals.user.registered2FA &&
			!event.locals.session.twoFactorVerified
		) {
			return fail(403, { form: { message: 'Forbidden' } });
		}
		if (!sendVerificationEmailBucket.check(event.locals.user.id, 1)) {
			return fail(429, { form: { message: 'Too many requests' } });
		}
		const form = await superValidate(event, zod(emailSchema));
		if (!form.valid) return fail(400, { form });
		const email = form.data.email as string;
		const emailAvailable = await checkEmailAvailability(email);
		if (!emailAvailable) {
			return fail(400, { form: { message: 'This email is already used', form } });
		}
		const verificationRequest = await createEmailVerificationRequest(event.locals.user.id, email);
		sendVerificationEmail(verificationRequest.email, verificationRequest.code);
		setEmailVerificationRequestCookie(event, verificationRequest);
		redirect(302, '/auth/verify-email');
	},

	isMfaEnabled: async (event) => {
		if (!event.locals.user) return fail(401, { form: { message: 'Not authenticated' } });
		const form = await superValidate(event, zod(isMfaEnabledSchema));
		if (!form.valid) return fail(400, { form });
		const currentStatus = await getUserMFA(event.locals.user.id);
		const newMfaStatus = !(currentStatus?.isMfaEnabled ?? false);
		await updateUserMFA(event.locals.user.id, { isMfaEnabled: newMfaStatus });
		return message(form, { text: 'Authentication modifiée', newStatus: newMfaStatus });
	}
};
