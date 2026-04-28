import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server';

export const GET: RequestHandler = async ({ locals }) => {
	// Guard : utilisateur doit être connecté
	if (!locals.user) {
		return json({ validated: false }, { status: 401 });
	}

	try {
		const user = await prisma.user.findUnique({
			where: { id: locals.user.id },
			select: { photoValidationStatus: true }
		});

		if (!user) {
			return json({ validated: false }, { status: 404 });
		}

		return json({
			validated: user.photoValidationStatus === 'VALIDATED'
		});
	} catch (error) {
		console.error('[check-photo-status]', error);
		return json({ validated: false }, { status: 500 });
	}
};
