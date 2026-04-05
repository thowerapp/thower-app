import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Demo data - no Prisma for now
	const dayIndex = 21; // Jeudi
	const weekNumber = Math.ceil(dayIndex / 7);
	const weekStart = (weekNumber - 1) * 7 + 1;
	const weekEnd = Math.min(91, weekStart + 6);

	// Build week days with demo data
	const weekDays = [];
	for (let i = weekStart; i <= weekEnd; i++) {
		const dayOfWeek = (i - 1) % 7;
		const names = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
		weekDays.push({
			dayIndex: i,
			dayName: names[dayOfWeek],
			dayNum: ((i - 1) % 7) + 1,
			hasData: true,
			mealCount: 2,
			isToday: i === dayIndex
		});
	}

	// Demo today's meals
	const todayMeals = [
		{ id: '1', position: 'LUNCH', label: 'Repas 1 — Déjeuner', recipe: 'Salade niçoise revisitée' },
		{ id: '2', position: 'DINNER', label: 'Repas 2 — Dîner', recipe: null }
	];

	return {
		dayIndex,
		weekNumber,
		weekStart,
		weekEnd,
		weekDays,
		todayMeals
	};
};
