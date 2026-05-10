import { zod } from '$lib/superforms-zod';
import type { PageServerLoad, Actions } from './$types';
import { superValidate, fail } from 'sveltekit-superforms';
import { redirect } from '@sveltejs/kit';
import { dailyTaskSchema, type DailyTaskSchema } from '$lib/schema/dailyTask/dailyTaskSchema';
import { prisma } from '$lib/server';
import { serializeData } from '$lib/utils/serializeData';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || locals.role !== 'ADMIN') {
		throw redirect(302, '/auth/login');
	}

	const form = await superValidate(zod(dailyTaskSchema));

	const discoveryContents = serializeData(
		await prisma.discoveryContent.findMany({
			where: { active: true },
			orderBy: [{ category: 'asc' }, { order: 'asc' }],
			select: { id: true, title: true, category: true }
		})
	);

	return { form, discoveryContents };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user || locals.role !== 'ADMIN') {
			return fail(403, { message: 'Accès refusé.' });
		}

		const form = await superValidate(request, zod(dailyTaskSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const { label, points, order, type, discoveryContentId, active, showFromDay, showUntilDay } =
			form.data as DailyTaskSchema;

		try {
			await prisma.dailyTask.create({
				data: {
					label,
					points,
					order,
					type,
					active,
					discoveryContent:
						type === 'VIDEO' && discoveryContentId
							? { connect: { id: discoveryContentId } }
							: undefined,
					showFromDay: showFromDay ?? null,
					showUntilDay: showUntilDay ?? null
				}
			});
			throw redirect(302, '/admin/daily-tasks');
		} catch (err) {
			if ((err as { status?: number }).status === 302) throw err;
			console.error('[admin/daily-tasks/create] error', err);
			return fail(500, { form });
		}
	}
};
