import { z } from 'zod';

/** Aligné sur l’enum Prisma `BreadType` — nutrition indicative pour 100 g (kcal, macros). */
export const BREAD_TYPE_VALUES = [
	'WHITE_BAGUETTE',
	'WHOLE_WHEAT',
	'RYE',
	'CORN',
	'COUNTRY',
	'MULTIGRAIN'
] as const;

export const breadTypeEnum = z.enum(BREAD_TYPE_VALUES);

export type BreadTypeValue = z.infer<typeof breadTypeEnum>;

export const BREAD_TYPE_LABELS: Record<BreadTypeValue, string> = {
	WHITE_BAGUETTE: 'Pain blanc (baguette)',
	WHOLE_WHEAT: 'Pain complet',
	RYE: 'Pain de seigle',
	CORN: 'Pain de maïs',
	COUNTRY: 'Pain de campagne',
	MULTIGRAIN: 'Pain aux céréales'
};

/** Valeurs pour 100 g (sources indicatives type tableau nutritionnel). */
export const BREAD_NUTRITION_PER_100G: Record<
	BreadTypeValue,
	{ kcal: number; proteinG: number; carbsG: number; fatG: number; fiberG: number }
> = {
	WHITE_BAGUETTE: { kcal: 265, proteinG: 8, carbsG: 55, fatG: 1, fiberG: 2.5 },
	WHOLE_WHEAT: { kcal: 245, proteinG: 9, carbsG: 45, fatG: 2, fiberG: 7 },
	RYE: { kcal: 250, proteinG: 8, carbsG: 48, fatG: 1.5, fiberG: 8.5 },
	CORN: { kcal: 280, proteinG: 7, carbsG: 55, fatG: 3.5, fiberG: 3 },
	COUNTRY: { kcal: 255, proteinG: 8, carbsG: 52, fatG: 1.2, fiberG: 4 },
	MULTIGRAIN: { kcal: 285, proteinG: 10, carbsG: 45, fatG: 5.5, fiberG: 6.5 }
};

export const breadTypeOptions: { value: BreadTypeValue; label: string }[] = BREAD_TYPE_VALUES.map(
	(value) => ({
		value,
		label: BREAD_TYPE_LABELS[value]
	})
);

/** Apporte nutritionnel du pain pour une quantité `grams` (g) et un type donné. */
export function breadMacrosForGrams(
	type: BreadTypeValue,
	grams: number
): { kcal: number; proteinG: number; carbsG: number; fatG: number; fiberG: number } {
	const ref = BREAD_NUTRITION_PER_100G[type];
	const s = grams / 100;
	return {
		kcal: ref.kcal * s,
		proteinG: ref.proteinG * s,
		carbsG: ref.carbsG * s,
		fatG: ref.fatG * s,
		fiberG: ref.fiberG * s
	};
}

/** Champ formulaire : grammes/jour (optionnel, 0 = pas d’apport pain pour les calculs). */
export const breadGramsPerDayField = z.preprocess(
	(val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
	z.number().min(0).max(2000).optional()
);

/** Champ formulaire : type de pain (liste déroulante, optionnel). */
export const breadTypeField = z.preprocess(
	(val) => (val === '' || val === null || val === undefined ? undefined : val),
	breadTypeEnum.optional()
);
