import { verifyTOTP } from '@oslojs/otp';
import { getUserTOTPKey } from '$lib/lucia/user';
import { validatePasswordResetSessionRequest } from '$lib/lucia/passwordReset';
import { setPasswordResetSessionAs2FAVerified } from '$lib/prisma/passwordResetSession/passwordResetSession';
import { totpBucket } from '$lib/lucia/2fa';
import { redirect } from '@sveltejs/kit';
import { resetUser2FAWithRecoveryCode } from '$lib/lucia/2fa';
import { recoveryCodeBucket } from '$lib/lucia/2fa';

import type { Actions, RequestEvent } from './$types';
import { recoveryCodeSchema } from '$lib/schema/auth/recoveryCodeSchema';
import { totpCodeSchema } from '$lib/schema/auth/totpCodeSchema';
import { zod } from '$lib/superforms-zod';
import { message, superValidate } from 'sveltekit-superforms';

export const load = async (event: RequestEvent) => {
	const { session, user } = await validatePasswordResetSessionRequest(event);
	// console.log(session, user, 'iuhfrsdluifhgdirughrdiughdrui');

	if (session === null) {
		return redirect(302, '/auth/forgot-password');
	}
	if (!session.emailVerified) {
		return redirect(302, '/auth/reset-password/verify-email');
	}
	if (!user.registered2FA) {
		return redirect(302, '/auth/reset-password');
	}
	if (session.twoFactorVerified) {
		return redirect(302, '/auth/reset-password');
	}
	const totpForm = await superValidate(event, zod(totpCodeSchema));
	const recoveryCodeForm = await superValidate(event, zod(recoveryCodeSchema));

	return {
		totpForm,
		recoveryCodeForm
	};
};

export const actions: Actions = {
	totp: totpAction,
	recovery_code: recoveryCodeAction
};

async function totpAction(event: RequestEvent) {
	const { session, user } = await validatePasswordResetSessionRequest(event);

	const formData = await event.request.formData();

	const form = await superValidate(formData, zod(totpCodeSchema));

	if (session === null) {
		return message(form, 'Session expirée : reconnectez-vous.');
	}
	if (!session.emailVerified || !user.registered2FA || session.twoFactorVerified) {
		return message(form, 'Action non autorisée.');
	}
	if (!totpBucket.check(session.userId, 1)) {
		return message(form, 'Trop de tentatives, réessayez dans quelques minutes.');
	}

	const code = formData.get('code');
	if (typeof code !== 'string') {
		return message(form, 'Champs manquants ou invalides.');
	}
	if (code === '') {
		return message(form, 'Saisissez votre code.');
	}
	const totpKey = await getUserTOTPKey(session.userId);
	if (totpKey === null) {
		return message(form, 'Action non autorisée.');
	}
	if (!totpBucket.consume(session.userId, 1)) {
		return message(form, 'Trop de tentatives, réessayez dans quelques minutes.');
	}

	try {
		const isValid = verifyTOTP(totpKey, 30, 6, code);

		if (!isValid) {
			return message(form, 'Code de double authentification incorrect.');
		}
	} catch (error) {
		return message(form, 'Erreur serveur, réessayez.', { status: 500 });
	}

	totpBucket.reset(session.userId);
	await setPasswordResetSessionAs2FAVerified(session.id);
	redirect(302, '/auth/reset-password');
}

async function recoveryCodeAction(event: RequestEvent) {
	const { session, user } = await validatePasswordResetSessionRequest(event);
	const formData = await event.request.formData();

	const form = await superValidate(formData, zod(recoveryCodeSchema));

	if (session === null) {
		return message(form, 'Session expirée : reconnectez-vous.');
	}
	if (!session.emailVerified || !user.registered2FA || session.twoFactorVerified) {
		return message(form, 'Action non autorisée.');
	}

	if (!recoveryCodeBucket.check(session.userId, 1)) {
		return message(form, 'Trop de tentatives, réessayez dans quelques minutes.');
	}

	const { code } = form.data;

	if (typeof code !== 'string') {
		return message(form, 'Champs manquants ou invalides.');
	}
	if (code === '') {
		return message(form, 'Saisissez votre code.');
	}
	if (!recoveryCodeBucket.consume(session.userId, 1)) {
		return message(form, 'Trop de tentatives, réessayez dans quelques minutes.');
	}

	const valid = await resetUser2FAWithRecoveryCode(session.userId, code);

	if (!valid) {
		return message(form, 'Code incorrect.');
	}

	recoveryCodeBucket.reset(session.userId);

	redirect(302, '/auth/reset-password');
}
