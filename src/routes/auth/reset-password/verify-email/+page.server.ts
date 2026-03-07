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
			return message(form, 'Not authenticated');
		}
		if (session.emailVerified) {
			return message(form, 'Forbidden');
		}
		if (!bucket.check(session.userId, 1)) {
			return message(form, 'Too many requests');
		}

		const { code } = form.data;

		if (typeof code !== 'string') {
			return message(form, 'Invalid or missing fields');
		}
		if (code === '') {
			return message(form, 'Please enter your code');
		}
		if (!bucket.consume(session.userId, 1)) {
			return message(form, 'Too many requests');
		}
		if (code !== session.code) {
			return message(form, 'Incorrect code');
		}
		bucket.reset(session.userId);
		setPasswordResetSessionAsEmailVerified(session.id);
		const emailMatches = setUserAsEmailVerifiedIfEmailMatches(session.userId, session.email);
		if (!emailMatches) {
			return message(form, 'Please restart the process');
		}
		return redirect(302, '/auth/reset-password/2fa');
	}
};
