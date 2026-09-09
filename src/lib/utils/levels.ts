export const LEVELS = [
	{ min: 0, num: 1, name: 'Bambou en herbe', nextMin: 200 },
	{ min: 200, num: 2, name: 'Bambou Furieux', nextMin: 500 },
	{ min: 500, num: 3, name: 'Guerrier en devenir', nextMin: 1000 },
	{ min: 1000, num: 4, name: 'Guerrier Thower', nextMin: 2000 },
	{ min: 2000, num: 5, name: 'Maître Thower', nextMin: null }
] as const;

export function computeLevel(points: number) {
	const levelData = LEVELS.slice().reverse().find((l) => points >= l.min) ?? LEVELS[0];
	const levelPercent =
		levelData.nextMin != null
			? Math.round(((points - levelData.min) / (levelData.nextMin - levelData.min)) * 100)
			: 100;
	return { levelData, levelPercent };
}
