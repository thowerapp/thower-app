import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server';
import { serializeData } from '$lib/utils/serializeData';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || locals.role !== 'ADMIN') {
		throw redirect(302, '/auth/login');
	}


	const rawTasks = await prisma.dailyTask.findMany({
		orderBy: { order: 'asc' },
		include: {
			discoveryContent: {
				select: { id: true, title: true, category: true }
			}
		}
	});

	const tasks = serializeData(
		rawTasks.map((t) => {
			const from = t.showFromDay;
			const until = t.showUntilDay;
			let joursLabel = 'Tous';
			if (from != null || until != null) {
				if (from === until) joursLabel = `Jour ${from}`;
				else if (!until) joursLabel = `J${from}+`;
				else joursLabel = `J${from}–${until}`;
			}
			return {
				...t,
				videoTitle: t.discoveryContent?.title ?? '—',
				videoCategory: t.discoveryContent?.category ?? null,
				joursLabel
			};
		})
	);

	return { tasks };
};

export const actions: Actions = {
	deleteTask: async ({ request, locals }) => {
		if (!locals.user || locals.role !== 'ADMIN') {
			return fail(403, { message: 'Accès refusé.' });
		}

		const formData = await request.formData();
		const id = formData.get('id');

		if (!id || typeof id !== 'string') {
			return fail(400, { message: 'ID manquant.' });
		}

		try {
			await prisma.$transaction([
				prisma.dailyTaskCompletion.deleteMany({ where: { taskId: id } }),
				prisma.userDailyTaskOptOut.deleteMany({ where: { taskId: id } }),
				prisma.dailyTask.delete({ where: { id } })
			]);
			return { success: true };
		} catch (err) {
			console.error('[admin/daily-tasks] deleteTask error', err);
			return fail(500, { message: 'Erreur lors de la suppression.' });
		}
	}
};
