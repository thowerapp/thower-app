import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server';

/** POST : coche ou décoche la séance sport du jour (completedAt). */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const userId = params.id;
	const body = await request.json().catch(() => ({}));
	const dayIndex = typeof body.dayIndex === 'number' ? body.dayIndex : undefined;
	const completed = typeof body.completed === 'boolean' ? body.completed : undefined;

	if (dayIndex == null || completed == null || dayIndex < 1 || dayIndex > 90) {
		return json({ error: 'Invalid body: dayIndex (1-90) and completed required' }, { status: 400 });
	}

	const workoutDay = await prisma.userWorkoutDay.findFirst({
		where: { userId, dayIndex }
	});

	if (!workoutDay) {
		return json({ error: 'No workout for this day' }, { status: 404 });
	}

	await prisma.userWorkoutDay.update({
		where: { id: workoutDay.id },
		data: { completedAt: completed ? new Date() : null }
	});

	return json({ ok: true, completed });
};
