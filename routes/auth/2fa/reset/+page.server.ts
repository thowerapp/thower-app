import { recoveryCodeBucket, resetUser2FAWithRecoveryCode } from '$lib/lucia/2fa';
import { fail, redirect } from '@sveltejs/kit';

import type { Actions, RequestEvent } from './$types';
import { message, superValidate } from 'sveltekit-superforms';
import { verifyCodeSchema } from '$lib/schema/auth/verifyCodeSchema';
import { zod } from '$lib/superforms-zod';

export const load = async (event: RequestEvent) => {
	if (event.locals.session === null || event.locals.user === null) {
		return redirect(302, '/auth/login');
	}
	if (!event.locals.user.emailVerified) {
		return redirect(302, '/auth/verify-email');
	}
	if (!event.locals.user.registered2FA) {
		if (event.locals.user.isMfaEnabled) {
			return redirect(302, '/auth/2fa/setup');
		}
	}
	if (event.locals.session.twoFactorVerified) {
		return redirect(302, '/auth/');
	}
	const verifyCodeForm = await superValidate(event, zod(verifyCodeSchema));
	return { verifyCodeForm };
};

export const actions: Actions = {
	recovery_code: async (event: RequestEvent) => {
		const formData = await event.request.formData();
		const code = formData.get('code');

		const form = await superValidate(formData, zod(verifyCodeSchema));

		if (event.locals.session === null || event.locals.user === null) {
			return message(form, 'Not authenticated');
		}
		if (
			!event.locals.user.emailVerified ||
			!event.locals.user.registered2FA ||
			event.locals.session.twoFactorVerified
		) {
			return message(form, 'Forbidden');
		}
		if (!recoveryCodeBucket.check(event.locals.user.id, 1)) {
			return message(form, 'Too many requests');
		}

		if (typeof code !== 'string') {
			return message(form, 'Invalid or missing fields');
		}
		if (code === '') {
			return message(form, 'Please enter your code');
		}
		if (!recoveryCodeBucket.consume(event.locals.user.id, 1)) {
			return message(form, 'Too many requests');
		}
		const valid = await resetUser2FAWithRecoveryCode(event.locals.user.id, code);
		if (!valid) {
			return message(form, 'Invalid recovery code');
		}
		recoveryCodeBucket.reset(event.locals.user.id);
		if (event.locals.user.isMfaEnabled) {
			return redirect(302, '/auth/2fa/setup');
		}
		return redirect(302, '/auth/');
	}
};
