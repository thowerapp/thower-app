import { fail, redirect } from '@sveltejs/kit';
import {
	createEmailVerificationRequest,
	deleteEmailVerificationRequestCookie,
	deleteUserEmailVerificationRequest,
	getUserEmailVerificationRequestFromRequest,
	sendVerificationEmail,
	sendVerificationEmailBucket,
	setEmailVerificationRequestCookie
} from '$lib/lucia/email-verification';

import { invalidateUserPasswordResetSessions } from '$lib/prisma/passwordResetSession/passwordResetSession';
import { updateUserEmailAndSetEmailAsVerified } from '$lib/lucia/user';
import { ExpiringTokenBucket } from '$lib/lucia/rate-limit';

import type { Actions, RequestEvent } from './$types';
import { verifyCodeSchema } from '$lib/schema/auth/verifyCodeSchema';
import { zod } from '$lib/superforms-zod';
import { superValidate } from 'sveltekit-superforms';
import { getUserByEmailPrisma } from '$lib/prisma/user/user';

const bucket = new ExpiringTokenBucket<string>(5, 60 * 30);

function log(...args: unknown[]) {
	console.log('[verify]', ...args);
}

export const load = async (event) => {
	log('load start');

	if (!event.locals.user) {
		log('No user in locals → redirect to login');
		throw redirect(302, '/auth/login');
	}

	// ✅ Recharge l’utilisateur avec données fraîches (emailVerified à jour)
	const freshUser = await getUserByEmailPrisma(event.locals.user.email);
	if (!freshUser) {
		log('User not found in DB → redirect to login');
		throw redirect(302, '/auth/login');
	}

	// ✅ Si on détecte une mise à jour d'état (ex: vérification de l’email), on sync locals
	if (freshUser.emailVerified !== event.locals.user.emailVerified) {
		log('User state updated → syncing locals.user');
		event.locals.user.emailVerified = freshUser.emailVerified;
	}

	const verifyCode = await superValidate(zod(verifyCodeSchema));

	let verificationRequest = await getUserEmailVerificationRequestFromRequest(event);
	log('Initial request', verificationRequest);

	if (verificationRequest === null || Date.now() >= verificationRequest.expiresAt.getTime()) {
		log('Request missing or expired');

		if (freshUser.emailVerified) {
			log('Email already verified → redirect to /auth/');
			throw redirect(302, '/auth/');
		}

		verificationRequest = await createEmailVerificationRequest(freshUser.id, freshUser.email);
		log('New verification request created', verificationRequest);

		log('Calling sendVerificationEmail from load...');
		await sendVerificationEmail(verificationRequest.email, verificationRequest.code);
		log('sendVerificationEmail from load completed');
		setEmailVerificationRequestCookie(event, verificationRequest);
	}

	log('load done → render form');
	return {
		verifyCode,
		email: verificationRequest.email
	};
};

export const actions: Actions = {
	verifyCode: verifyCode,
	resendCode: resendEmail
};

async function verifyCode(event: RequestEvent) {
	log('Action: verifyCode');

	if (event.locals.session === null || event.locals.user === null) {
		log('No session/user in event');
		return fail(401, { verify: { message: 'Not authenticated' } });
	}

	if (
		event.locals.user.isMfaEnabled &&
		event.locals.user.registered2FA &&
		!event.locals.session.twoFactorVerified
	) {
		log('MFA enabled but not verified');
		return fail(403, { verify: { message: 'Forbidden' } });
	}

	if (!bucket.check(event.locals.user.id, 1)) {
		log('Rate limit pre-check failed');
		return fail(429, { verify: { message: 'Too many requests' } });
	}

	let verificationRequest = await getUserEmailVerificationRequestFromRequest(event);
	log('Verification request fetched', verificationRequest);

	if (verificationRequest === null) {
		log('Missing verification request');
		return fail(401, { verify: { message: 'Not authenticated' } });
	}

	const formData = await event.request.formData();
	const code = formData.get('code');
	log('Code received:', code);

	if (typeof code !== 'string' || code === '') {
		log('Code is invalid');
		return fail(400, { verify: { message: 'Enter your code' } });
	}

	if (!bucket.consume(event.locals.user.id, 1)) {
		log('Rate limit consume failed');
		return fail(429, { verify: { message: 'Too many requests' } });
	}

	if (Date.now() >= verificationRequest.expiresAt.getTime()) {
		log('Code expired → regenerating');

		verificationRequest = await createEmailVerificationRequest(
			verificationRequest.userId,
			verificationRequest.email
		);
		log('Calling sendVerificationEmail (expired code)...');
		await sendVerificationEmail(verificationRequest.email, verificationRequest.code);
		log('sendVerificationEmail (expired) completed');
		setEmailVerificationRequestCookie(event, verificationRequest);
		return {
			verify: {
				message: 'The verification code was expired. We sent another code to your inbox.'
			}
		};
	}

	if (verificationRequest.code !== code) {
		log('Invalid code provided');
		return fail(400, { verify: { message: 'Incorrect code.' } });
	}

	log('Code valid → confirming email');
	deleteUserEmailVerificationRequest(event.locals.user.id);
	invalidateUserPasswordResetSessions(event.locals.user.id);
	await updateUserEmailAndSetEmailAsVerified(event.locals.user.id, verificationRequest.email);
	deleteEmailVerificationRequestCookie(event);

	if (!event.locals.user.registered2FA && event.locals.user.isMfaEnabled) {
		log('MFA enabled → redirect to setup');
		return redirect(302, '/auth/2fa/setup');
	}

	log('Email verified → redirect to dashboard');
	return redirect(303, '/auth/');
}

async function resendEmail(event: RequestEvent) {
	log('Action: resendEmail');

	if (event.locals.session === null || event.locals.user === null) {
		log('No session/user');
		return fail(401, { resend: { message: 'Not authenticated' } });
	}

	if (event.locals.user.registered2FA && !event.locals.session.twoFactorVerified) {
		log('2FA required but not verified');
		return fail(403, { resend: { message: 'Forbidden' } });
	}

	if (!sendVerificationEmailBucket.check(event.locals.user.id, 1)) {
		log('Rate-limit resend check failed');
		return fail(429, { resend: { message: 'Too many requests' } });
	}

	let verificationRequest = await getUserEmailVerificationRequestFromRequest(event);

	if (verificationRequest === null) {
		if (event.locals.user.emailVerified) {
			log('User already verified → resend forbidden');
			return fail(403, { resend: { message: 'Forbidden' } });
		}

		if (!sendVerificationEmailBucket.consume(event.locals.user.id, 1)) {
			log('Rate-limit consume failed on resend');
			return fail(429, { resend: { message: 'Too many requests' } });
		}

		verificationRequest = await createEmailVerificationRequest(
			event.locals.user.id,
			event.locals.user.email
		);
		log('New verification request created (no previous one)');
	} else {
		if (!sendVerificationEmailBucket.consume(event.locals.user.id, 1)) {
			log('Rate-limit consume failed on resend (existing request)');
			return fail(429, { resend: { message: 'Too many requests' } });
		}

		verificationRequest = await createEmailVerificationRequest(
			event.locals.user.id,
			verificationRequest.email
		);
		log('Verification request regenerated');
	}

	log('Calling sendVerificationEmail (resend)...', { email: verificationRequest.email });
	try {
		await sendVerificationEmail(verificationRequest.email, verificationRequest.code);
		log('sendVerificationEmail (resend) completed');
	} catch (err) {
		log('sendVerificationEmail (resend) threw:', err);
		return fail(500, { resend: { message: 'Failed to send email' } });
	}
	setEmailVerificationRequestCookie(event, verificationRequest);
	log('Email resent to', verificationRequest.email);

	return {
		resend: {
			message: 'A new code was sent to your inbox.'
		}
	};
}
