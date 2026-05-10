import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './';
import { prisma } from '$lib/server';
import { upsertVideoProgress } from '$lib/prisma/userVideoProgress/upsertProgress';
import { autoCompleteVideoTask } from '$lib/prisma/dailyTask/autoCompleteVideoTask';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) throw redirect(302, '/auth/login');
	const userId = locals.user.id;
	const { id } = params;

	const db = prisma as any;
	if (!db?.discoveryContent) throw redirect(302, '/user/decouverte/explication');

	const content = await db.discoveryContent.findUnique({
		where: { id },
		select: { id: true, title: true, cloudflareUid: true, thumbnailUrl: true, category: true, active: true }
	});

	if (!content || !content.active || content.category !== 'EXPLICATION') {
		throw redirect(302, '/user/decouverte/explication');
	}

	const progress = await db.userVideoProgress?.findFirst({
		where: { userId, discoveryContentId: id, completedAt: { not: null } }
	});

	const isLocal = (content.cloudflareUid as string).startsWith('local:');
	const videoSrc = isLocal ? encodeURI((content.cloudflareUid as string).slice(6)) : null;
	const thumbSrc = content.thumbnailUrl ? encodeURI(content.thumbnailUrl as string) : null;

	return {
		video: {
			id: content.id as string,
			title: content.title as string,
			videoSrc,
			thumbSrc,
			isLocal,
			watched: !!progress
		}
	};
};

export const actions: Actions = {
	markWatched: async ({ locals, params }) => {
		if (!locals.user) return fail(401, {});
		const userId = locals.user.id;
		const { id } = params;

		try {
			const result = await upsertVideoProgress({
				kind: 'discovery',
				userId,
				discoveryContentId: id,
				positionSec: 9999,
				ended: true
			});

			if (result.completedNow) {
				const taskPts = await autoCompleteVideoTask(userId, id);
				await (prisma as any).pointEvent?.create({
					data: {
						userId,
						type: 'VIDEO_WATCHED',
						amount: 10,
						metadata: { discoveryContentId: id, source: 'explication' }
					}
				});
				return { success: true, pointsEarned: 10 + taskPts };
			}
			return { success: true, pointsEarned: 0 };
		} catch {
			return fail(500, { message: 'Erreur serveur' });
		}
	}
};
