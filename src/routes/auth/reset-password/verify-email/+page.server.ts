import { validatePasswordResetSessionRequest } from '$lib/lucia/passwordReset';
import { setPasswordResetSessionAsEmailVerified } from '$lib/prisma/passwordResetSession/passwordResetSession';
import { ExpiringTokenBucket } from '$lib/lucia/rate-limit';
import { setUserAsEmailVerifiedIfEmailMatches } from '$lib/lucia/user';
import { fail, redirect } from '@sveltejs/kit';

import type { Actions, RequestEvent } from './$types';
import { verifyCodeSchema } from '$lib/schema/auth/verifyCodeSchema';
import { zod } from '$lib/superforms-zod';
import { message, superValidate } from 'sveltekit-superforms';

const bucket = new ExpiringTokenBucket<string>(5, 60 * 30);

export const load = async (event: RequestEvent) => {
	const { session } = await validatePasswordResetSessionRequest(event);
	// // console.log(
	// 	session,
	// );
	if (session === null) {
		// console.log('Session is null, redirecting to /auth/forgot-password');
		return redirect(302, '/auth/forgot-password');
	}

	if (!session.emailVerified) {
		// console.log('Email is not verified, staying on verify email page.');
	}
	const verifyForm = await superValidate(event, zod(verifyCodeSchema));

	return {
		email: session.email,
		verifyForm
	};
};

export const actions: Actions = {
	verify: async (event: RequestEvent) => {
		const { session } = await validatePasswordResetSessionRequest(event);
		const formData = await event.request.formData();
		// console.log(formData, 'form data');

		const form = await superValidate(formData, zod(verifyCodeSchema));
		// console.log(form, 'oiuhoiuh');

		if (session === null) {
			return message(form, 'Session expirée : reconnectez-vous.', { status: 400 });
		}
		if (session.emailVerified) {
			return message(form, 'Action non autorisée.', { status: 400 });
		}
		if (!bucket.check(session.userId, 1)) {
			return message(form, 'Trop de tentatives, réessayez dans quelques minutes.', { status: 400 });
		}

		const { code } = form.data;

		if (typeof code !== 'string') {
			return message(form, 'Champs manquants ou invalides.', { status: 400 });
		}
		if (code === '') {
			return message(form, 'Saisissez votre code.', { status: 400 });
		}
		if (!bucket.consume(session.userId, 1)) {
			return message(form, 'Trop de tentatives, réessayez dans quelques minutes.', { status: 400 });
		}
		if (code !== session.code) {
			return message(form, 'Code incorrect.', { status: 400 });
		}
		bucket.reset(session.userId);
		setPasswordResetSessionAsEmailVerified(session.id);
		const emailMatches = setUserAsEmailVerifiedIfEmailMatches(session.userId, session.email);
		if (!emailMatches) {
			return message(form, 'Recommencez la procédure depuis le début.', { status: 400 });
		}
		return redirect(302, '/auth/reset-password/2fa');
	}
};
