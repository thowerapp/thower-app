type RGB = [number, number, number];

const GOLD:  RGB = [201, 168, 78];
const WHITE: RGB = [240, 237, 232];
const CYAN:  RGB = [0,   229, 255];

function lerp(a: number, b: number, t: number): number {
	return Math.round(a + (b - a) * t);
}

function lerpRGB(c1: RGB, c2: RGB, t: number): RGB {
	return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

function toHex([r, g, b]: RGB): string {
	return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function toRgba([r, g, b]: RGB, a: number): string {
	return `rgba(${r},${g},${b},${a})`;
}

/** Interpolation gold→blanc (j1–j45) puis blanc→cyan (j46–j91). */
export function computeThemeVars(dayIndex: number): string {
	const progress = Math.max(0, Math.min(1, (dayIndex - 1) / 90));

	const accent: RGB = progress <= 0.5
		? lerpRGB(GOLD, WHITE, progress * 2)
		: lerpRGB(WHITE, CYAN, (progress - 0.5) * 2);

	const vars: Record<string, string> = {
		'--g':  toHex(accent),
		'--gb': toHex(accent),
		'--gg': toRgba(accent, 0.18),
		'--gd': toRgba(accent, 0.55),
	};

	return Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';');
}
