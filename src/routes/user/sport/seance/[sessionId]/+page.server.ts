import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { prisma } from '$lib/server';
import {
	calendarDateForProgramDay,
	currentProgramDayIndex,
	startOfUtcDay
} from '$lib/utils/programDay';
import { serializeData } from '$lib/utils/serializeData';
import { requireSportAccess } from '$lib/server/programAccessGuard';

const OID = /^[a-f\d]{24}$/i;

export const load: PageServerLoad = async ({ locals, params, url }) => {
	if (!locals.user) throw redirect(302, '/auth/login');

	const sessionId = params.sessionId;
	if (!OID.test(sessionId)) throw error(400, 'Identifiant de séance invalide.');

	const userId = locals.user.id;

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { programStartDate: true }
	});

	const rawDay = url.searchParams.get('day');
	let dayIndex =
		rawDay != null && rawDay !== ''
			? Number.parseInt(rawDay, 10)
			: currentProgramDayIndex(user?.programStartDate ?? null);
	if (!Number.isInteger(dayIndex) || dayIndex < 1 || dayIndex > 91) {
		dayIndex = currentProgramDayIndex(user?.programStartDate ?? null);
	}

	const session = await prisma.workoutSession.findUnique({
		where: { id: sessionId },
		include: {
			videos: { orderBy: { order: 'asc' } }
		}
	});
	if (!session || !session.active) {
		throw error(404, 'Séance introuvable.');
	}

	const videoIds = session.videos.map((v) => v.id);

	const [userDay, progressRows] = await Promise.all([
		prisma.userWorkoutDay.findFirst({
			where: { userId, sessionId, dayIndex },
			select: {
				id: true,
				completedAt: true,
				isLocked: true,
				dayIndex: true
			}
		}),
		videoIds.length > 0
			? prisma.userVideoProgress.findMany({
					where: { userId, workoutVideoId: { in: videoIds }, completedAt: { not: null } },
					select: { workoutVideoId: true, completedAt: true }
				})
			: Promise.resolve([])
	]);

	const completedVideoIds = new Set(
		(progressRows as { workoutVideoId: string }[]).map((r) => r.workoutVideoId)
	);

	let scheduledISO: string | null = null;
	const ps = user?.programStartDate;
	if (ps) {
		scheduledISO = calendarDateForProgramDay(ps, dayIndex).toISOString();
	}

	const videos = session.videos.map((v) => ({
		id: v.id,
		title: v.title,
		position: v.position,
		order: v.order,
		status: v.status ?? 'pending',
		cloudflareUid: v.cloudflareUid,
		isOptional: v.isOptional,
		videoCompleted: completedVideoIds.has(v.id),
		durationSeconds: v.durationSeconds ?? null
	}));

	const mandatoryVideos = session.videos.filter((v) => !v.isOptional);
	const allMandatoryVideosCompleted =
		mandatoryVideos.length === 0 ||
		mandatoryVideos.every((v) => completedVideoIds.has(v.id));

	return serializeData({
		sessionId,
		sessionName: session.name,
		sessionType: session.type,
		dayIndex,
		scheduledDateISO: scheduledISO,
		seanceCompletedAt: userDay?.completedAt?.toISOString() ?? null,
		seanceLocked: userDay?.isLocked ?? false,
		userDayExists: !!userDay,
		videos,
		allMandatoryVideosCompleted
	});
};

export const actions: Actions = {
	markCompleted: async ({ locals, params, request }) => {
		if (!locals.user) return fail(401, { message: 'Non authentifié.' });
		await requireSportAccess(locals.user.id, locals.user.role);
		const sessionId = params.sessionId;
		if (!OID.test(sessionId)) return fail(400, { message: 'Identifiant invalide.' });

		const fd = await request.formData();
		const raw = fd.get('dayIndex');
		const dayIdx =
			raw != null && raw !== ''
				? Number.parseInt(String(raw), 10)
				: NaN;
		if (!Number.isInteger(dayIdx) || dayIdx < 1 || dayIdx > 91) {
			return fail(400, { message: 'Jour programme invalide.' });
		}

		const userId = locals.user.id;
		const now = new Date();

		const session = await prisma.workoutSession.findUnique({
			where: { id: sessionId },
			select: { id: true, active: true }
		});
		if (!session?.active) return fail(404, { message: 'Séance introuvable.' });

		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { programStartDate: true }
		});

		let scheduledDate: Date | undefined;
		if (user?.programStartDate) {
			const d = calendarDateForProgramDay(user.programStartDate, dayIdx);
			scheduledDate = startOfUtcDay(d);
		}

		await prisma.userWorkoutDay.upsert({
			where: {
				userId_sessionId_dayIndex: {
					userId,
					sessionId,
					dayIndex: dayIdx
				}
			},
			create: {
				userId,
				sessionId,
				dayIndex: dayIdx,
				scheduledDate: scheduledDate ?? undefined,
				completedAt: now,
				isLocked: false
			},
			update: {
				completedAt: now,
				scheduledDate: scheduledDate ?? undefined
			}
		});

		return { success: true };
	}
};
