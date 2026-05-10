import { zod } from '$lib/superforms-zod';
import type { PageServerLoad, Actions } from './$types';
import { message, superValidate, fail } from 'sveltekit-superforms';
import { redirect, error } from '@sveltejs/kit';
import {
	dailyTaskSchema,
	toggleActiveSchema,
	type DailyTaskSchema
} from '$lib/schema/dailyTask/dailyTaskSchema';
import { prisma } from '$lib/server';
import { serializeData } from '$lib/utils/serializeData';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user || locals.role !== 'ADMIN') {
		throw redirect(302, '/auth/login');
	}

	const task = await prisma.dailyTask.findUnique({
		where: { id: params.id },
		include: { discoveryContent: { select: { id: true, title: true, category: true } } }
	});

	if (!task) throw error(404, 'Tâche introuvable.');

	const form = await superValidate(serializeData(task), zod(dailyTaskSchema));

	const discoveryContents = serializeData(
		await prisma.discoveryContent.findMany({
			where: { active: true },
			orderBy: [{ category: 'asc' }, { order: 'asc' }],
			select: { id: true, title: true, category: true }
		})
	);

	return { form, discoveryContents, task: serializeData(task) };
};

export const actions: Actions = {
	update: async ({ request, locals, params }) => {
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
			await prisma.dailyTask.update({
			where: { id: params.id },
			data: {
				label,
				points,
				order,
				type,
				active,
				discoveryContent:
					type === 'VIDEO' && discoveryContentId
						? { connect: { id: discoveryContentId } }
						: { disconnect: true },
				showFromDay: showFromDay ?? null,
				showUntilDay: showUntilDay ?? null
			}
			});
			return message(form, 'Tâche mise à jour.');
		} catch (err) {
			console.error('[admin/daily-tasks/[id]] update error', err);
			return fail(500, { form });
		}
	},

	toggleActive: async ({ request, locals, params }) => {
		if (!locals.user || locals.role !== 'ADMIN') {
			return fail(403, { message: 'Accès refusé.' });
		}

		const form = await superValidate(
			{ id: params.id },
			zod(toggleActiveSchema)
		);

		if (!form.valid) return fail(400, { form });

		const task = await prisma.dailyTask.findUnique({
			where: { id: params.id },
			select: { active: true }
		});
		if (!task) return fail(404, { form, message: 'Tâche introuvable.' });

		await prisma.dailyTask.update({
			where: { id: params.id },
			data: { active: !task.active }
		});

		return message(form, task.active ? 'Tâche désactivée.' : 'Tâche activée.');
	},

	delete: async ({ locals, params }) => {
		if (!locals.user || locals.role !== 'ADMIN') {
			return fail(403, { message: 'Accès refusé.' });
		}

		try {
			await prisma.$transaction([
				prisma.dailyTaskCompletion.deleteMany({ where: { taskId: params.id } }),
				prisma.userDailyTaskOptOut.deleteMany({ where: { taskId: params.id } }),
				prisma.dailyTask.delete({ where: { id: params.id } })
			]);
			throw redirect(302, '/admin/daily-tasks');
		} catch (err) {
			if ((err as { status?: number }).status === 302) throw err;
			console.error('[admin/daily-tasks/[id]] delete error', err);
			return fail(500, { message: 'Erreur lors de la suppression.' });
		}
	}
};
