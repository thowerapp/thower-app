import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const dayIndex = parseInt(params.day) || 21;

	// Demo data
	const demos = [
		{
			id: 'meal1',
			position: 'LUNCH',
			label: 'Repas 1 — Déjeuner',
			time: '12h30',
			recipe: 'Salade niçoise revisitée',
			ingredients: ['Endives', 'Thon', 'Tomates cerises', 'Olives']
		},
		{
			id: 'meal2',
			position: 'DINNER',
			label: 'Repas 2 — Dîner',
			time: '19h00',
			recipe: null,
			ingredients: []
		}
	];

	return {
		dayIndex,
		meals: demos
	};
};

