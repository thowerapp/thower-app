import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server';
import type { Prisma } from '@prisma/client';

/** POST : coche ou décoche le repas (eatenAt). */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json().catch(() => ({}));
	const mealId = typeof body.mealId === 'string' ? body.mealId : undefined;
	const eaten = typeof body.eaten === 'boolean' ? body.eaten : undefined;

	if (!mealId || eaten == null) {
		return json({ error: 'Invalid body: mealId and eaten required' }, { status: 400 });
	}

	const meal = await prisma.meal.findUnique({
		where: { id: mealId }
	});

	if (!meal) {
		return json({ error: 'Meal not found' }, { status: 404 });
	}

	await prisma.meal.update({
		where: { id: mealId },
		data: { eatenAt: eaten ? new Date() : null } as Prisma.MealUpdateInput
	});

	return json({ ok: true, eaten });
};
