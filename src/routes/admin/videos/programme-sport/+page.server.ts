import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { explicitSessionType, getSportDaysInRange } from '$lib/server/sport/programSportDays';
import { invalidateSportPlan } from '$lib/server/sport/sportPlanCache';
import { TOTAL_PROGRAM_DAYS } from '$lib/utils/programDay';
import { SESSION_TYPE_LABELS } from '$lib/utils/adminVideoDays';

/** Récap lecture seule : ce que l'utilisateur verra sur chaque jour de séance (J1…J91). */
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || locals.role !== 'ADMIN') {
		throw redirect(302, '/admin');
	}

	// L'admin doit voir l'état réel (autre instance, statut Cloudflare), pas le cache.
	invalidateSportPlan();
	const sportDays = await getSportDaysInRange(1, TOTAL_PROGRAM_DAYS);

	// Semaines calendaires d'un programme démarré un lundi (cas général).
	const daysByTypeAndWeek = new Map<string, number[]>();
	for (const [dayIndex, videos] of sportDays) {
		const type = explicitSessionType(videos);
		if (!type || type === 'DISCOVERY') continue;
		const key = `${Math.ceil(dayIndex / 7)}:${type}`;
		daysByTypeAndWeek.set(key, [...(daysByTypeAndWeek.get(key) ?? []), dayIndex]);
	}

	const days = [...sportDays.entries()].map(([dayIndex, videos]) => {
		const pre = videos.filter((v) => v.position === 'PRE');
		const vid1 = videos.filter((v) => v.position === 'VID1');
		const vid2 = videos.filter((v) => v.position === 'VID2');

		const warnings: string[] = [];
		if (vid1.length === 0) warnings.push('Séance 1 manquante');
		if (vid2.length === 0) warnings.push('Séance 2 manquante');
		if (vid1.length > 1) warnings.push(`${vid1.length} vidéos en Séance 1`);
		if (vid2.length > 1) warnings.push(`${vid2.length} vidéos en Séance 2`);
		const notReady = videos.filter((v) => v.status !== 'ready').length;
		if (notReady > 0) warnings.push(`${notReady} vidéo(s) pas encore prête(s)`);

		const type = explicitSessionType(videos);
		if (type && type !== 'DISCOVERY') {
			const sameWeek = daysByTypeAndWeek.get(`${Math.ceil(dayIndex / 7)}:${type}`) ?? [];
			const others = sameWeek.filter((d) => d !== dayIndex);
			if (others.length > 0) {
				warnings.push(
					`${SESSION_TYPE_LABELS[type]} aussi sur ${others.map((d) => `J${d}`).join(', ')} (même semaine)`
				);
			}
		}

		const toRow = (v: (typeof videos)[number]) => ({ id: v.id, title: v.title, status: v.status });
		return {
			dayIndex,
			pre: pre.map(toRow),
			vid1: vid1.map(toRow),
			vid2: vid2.map(toRow),
			warnings
		};
	});

	return { days, totalProgramDays: TOTAL_PROGRAM_DAYS };
};
