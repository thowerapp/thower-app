import { z } from 'zod';

export const ALLERGEN_VALUES = [
	'gluten',
	'crustaces',
	'oeufs',
	'poisson',
	'arachides',
	'soja',
	'lait',
	'fruits_a_coque',
	'celeri',
	'moutarde',
	'sesame',
	'sulfites',
	'lupin',
	'mollusques'
] as const;

export const allergenEnum = z.enum(ALLERGEN_VALUES);

export type AllergenValue = z.infer<typeof allergenEnum>;

export function isAllergenValue(value: string): value is AllergenValue {
	return (ALLERGEN_VALUES as readonly string[]).includes(value);
}

/**
 * Codes anglais du catalogue d'origine (seed) vers le code canonique français de l'enum.
 * Les recettes existantes gardent leurs codes en base : la conversion se fait à la lecture.
 */
const LEGACY_ALLERGEN_CODES: Record<string, AllergenValue> = {
	eggs: 'oeufs',
	egg: 'oeufs',
	milk: 'lait',
	dairy: 'lait',
	lactose: 'lait',
	nuts: 'fruits_a_coque',
	tree_nuts: 'fruits_a_coque',
	peanuts: 'arachides',
	peanut: 'arachides',
	fish: 'poisson',
	shellfish: 'crustaces',
	crustaceans: 'crustaces',
	soy: 'soja',
	soya: 'soja',
	mustard: 'moutarde',
	celery: 'celeri',
	sulphites: 'sulfites',
	sulfite: 'sulfites',
	molluscs: 'mollusques',
	mollusks: 'mollusques'
};

/** Code allergène canonique (enum français), ou null si le code ne correspond à aucun des 14 allergènes. */
export function normalizeAllergen(code: string): AllergenValue | null {
	const key = code.trim().toLowerCase();
	if (isAllergenValue(key)) return key;
	return LEGACY_ALLERGEN_CODES[key] ?? null;
}

/** Codes canoniques sans doublon ; les codes inconnus (ex. « seeds ») sont écartés. */
export function normalizeAllergens(codes: readonly string[] | null | undefined): AllergenValue[] {
	const out = new Set<AllergenValue>();
	for (const code of codes ?? []) {
		const value = normalizeAllergen(code);
		if (value) out.add(value);
	}
	return [...out];
}

/** Libellés français à afficher pour une liste de codes (anglais ou français). */
export function allergenLabels(codes: readonly string[] | null | undefined): string[] {
	return normalizeAllergens(codes).map((v) => ALLERGEN_LABELS[v]);
}

export const ALLERGEN_LABELS: Record<AllergenValue, string> = {
	gluten: 'Gluten',
	crustaces: 'Crustacés',
	oeufs: 'Œufs',
	poisson: 'Poisson',
	arachides: 'Arachides',
	soja: 'Soja',
	lait: 'Lait',
	fruits_a_coque: 'Fruits à coque',
	celeri: 'Céleri',
	moutarde: 'Moutarde',
	sesame: 'Sésame',
	sulfites: 'Sulfites',
	lupin: 'Lupin',
	mollusques: 'Mollusques'
};

export const allergenOptions: { value: AllergenValue; label: string }[] = ALLERGEN_VALUES.map(
	(value) => ({
		value,
		label: ALLERGEN_LABELS[value]
	})
);
