import { redirect } from '@sveltejs/kit';
import { deleteSessionTokenCookie, invalidateSession } from '$lib/lucia/session';
import { getBodyMeasurementsByUserId } from '$lib/prisma/bodyMeasurement/getBodyMeasurementsByUserId';
import { getHasValidPaymentByUserId } from '$lib/prisma/transaction/getHasValidPaymentByUserId';
import { prisma } from '$lib/server';

import type { Actions, PageServerLoadEvent } from './$types';

function logAuth(...args: unknown[]) {
	console.log('[auth/load]', ...args);
}

export const load = async (event: PageServerLoadEvent) => {
	logAuth('load start', {
		hasSession: event.locals.session != null,
		hasUser: event.locals.user != null
	});

	if (event.locals.session === null || event.locals.user === null) {
		logAuth('redirect → /auth/login (no session/user)');
		return redirect(302, '/auth/login');
	}
	if (!event.locals.user.emailVerified) {
		logAuth('redirect → /auth/verify-email');
		return redirect(302, '/auth/verify-email');
	}

	// 2FA redirects (compte non-Google)
	if (!event.locals.user.googleId) {
		if (!event.locals.user.isMfaEnabled) {
			// Pas de MFA → on charge les données paramètres
		} else {
			if (!event.locals.user.registered2FA) {
				logAuth('redirect → /auth/2fa/setup');
				return redirect(302, '/auth/2fa/setup');
			}
			if (!event.locals.session.twoFactorVerified) {
				logAuth('redirect → /auth/2fa');
				return redirect(302, '/auth/2fa');
			}
		}
	}

	const userId = event.locals.user.id;
	const isClient = event.locals.user.role === 'CLIENT';
	logAuth('user auth context', {
		userId,
		email: event.locals.user.email,
		role: event.locals.user.role,
		googleId: event.locals.user.googleId,
		isClient
	});

	const bodyMeasurements = await getBodyMeasurementsByUserId(userId, 1);
	const hasMeasurements = bodyMeasurements.length > 0;
	const [hasValidPayment, userRow, hasAnyTransaction, nutritionAgg, mealCount, onboardingPhotos] = await Promise.all([
		getHasValidPaymentByUserId(userId),
		prisma.user.findUnique({
			where: { id: userId },
			select: { subscriptionEndsAt: true, nutritionDaysAllocated: true }
		}),
		isClient
			? prisma.transaction.count({ where: { userId } }).then((n) => n > 0)
			: Promise.resolve(false),
		prisma.nutritionDay.aggregate({
			where: { userId },
			_max: { dayIndex: true },
			_count: { _all: true }
		}),
		prisma.meal.count({ where: { nutritionDay: { userId } } }),
		prisma.progressPhoto.findMany({
			where: {
				userId,
				month: 0,
				angle: { in: ['FRONT', 'SIDE', 'BACK'] }
			},
			select: { angle: true }
		})
	]);
	const hasPhotos = new Set(onboardingPhotos.map((photo) => photo.angle)).size === 3;

	if (isClient) {
		logAuth('programme nutrition (état DB)', {
			userId,
			nutritionDaysAllocated: userRow?.nutritionDaysAllocated ?? 0,
			nutritionDayRows: nutritionAgg._count._all,
			maxNutritionDayIndex: nutritionAgg._max.dayIndex ?? null,
			mealCount
		});
	} else {
		logAuth('non-client role detected, client UX disabled', {
			userId,
			role: event.locals.user.role,
			hasAnyTransaction
		});
	}

	logAuth('return settings data', {
		userId,
		role: event.locals.user.role,
		hasMeasurements,
		hasPhotos,
		hasValidPayment,
		hasAnyTransaction,
		subscriptionEndsAt: userRow?.subscriptionEndsAt ?? null
	});

	// Calcul de l'étape d'onboarding client
	let onboardingStep = 'payment';
	if (hasValidPayment && !hasPhotos) {
		onboardingStep = 'photos';
	} else if (hasValidPayment && hasPhotos && !hasMeasurements) {
		onboardingStep = 'measurement';
	} else if (hasValidPayment && hasPhotos && hasMeasurements) {
		onboardingStep = 'app_ready';
	}

	return {
		user: event.locals.user,
		hasMeasurements,
		hasPhotos,
		hasValidPayment,
		hasAnyTransaction,
		subscriptionEndsAt: userRow?.subscriptionEndsAt ?? null,
		onboardingStep
	};
};

// Seule la déconnexion est utilisée ici : mot de passe, email et double authentification sont dans /auth/account.
export const actions: Actions = {
	signout: async (event) => {
		if (event.locals.session) await invalidateSession(event.locals.session.id);
		deleteSessionTokenCookie(event);
		return redirect(302, '/auth/login');
	}
};
