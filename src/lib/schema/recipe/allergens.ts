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
