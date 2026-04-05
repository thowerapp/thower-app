import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Demo shopping list data aggregated from meal planning
	return {
		week: 4,
		days: 7,
		categories: {
			Protéines: [
				{ id: '1', name: 'Thon', qty: 400, unit: 'g' },
				{ id: '2', name: 'Poulet', qty: 500, unit: 'g' }
			],
			Légumes: [
				{ id: '3', name: 'Tomates', qty: 500, unit: 'g' },
				{ id: '4', name: 'Endives', qty: 300, unit: 'g' }
			],
			Condiments: [
				{ id: '5', name: 'Olives', qty: 200, unit: 'g' },
				{ id: '6', name: 'Huile olive', qty: 250, unit: 'ml' }
			]
		}
	};
};
