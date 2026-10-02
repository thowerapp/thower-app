import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getSportDaysInRange } from '$lib/server/sport/programSportDays';
import { TOTAL_PROGRAM_DAYS } from '$lib/utils/programDay';

/** Récap lecture seule : ce que l'utilisateur verra sur chaque jour de séance (J1…J91). */
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || locals.role !== 'ADMIN') {
		throw redirect(302, '/admin');
	}

	const sportDays = await getSportDaysInRange(1, TOTAL_PROGRAM_DAYS);

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
