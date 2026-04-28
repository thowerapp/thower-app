import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server';

export const load: PageServerLoad = async ({ locals }) => {
	// Guard : utilisateur doit être connecté
	if (!locals.user) {
		throw redirect(302, '/auth/login');
	}

	// Charger l'état actuel de validation
	const user = await prisma.user.findUnique({
		where: { id: locals.user.id },
		select: {
			photoValidationStatus: true,
			profile: {
				select: { bodyFatPercent: true }
			}
		}
	});

	if (!user) {
		throw redirect(302, '/auth/login');
	}

	// Si déjà validé, rediriger immédiatement vers le formulaire
	if (user.photoValidationStatus === 'VALIDATED') {
		throw redirect(302, '/auth/measurement');
	}

	return {
		user: locals.user,
		validationStatus: user.photoValidationStatus
	};
};
