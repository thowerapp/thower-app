import { z } from 'zod';

/** Aligné sur l’enum Prisma `RecipeKitchenEquipment`. */
export const RECIPE_KITCHEN_EQUIPMENT_VALUES = [
	'OVEN',
	'MICROWAVE',
	'BLENDER',
	'AIR_FRYER',
	'KITCHEN_SCALE',
	'COOKTOP'
] as const;

export const recipeKitchenEquipmentEnum = z.enum(RECIPE_KITCHEN_EQUIPMENT_VALUES);

export type RecipeKitchenEquipmentValue = z.infer<typeof recipeKitchenEquipmentEnum>;

export const RECIPE_KITCHEN_EQUIPMENT_LABELS: Record<RecipeKitchenEquipmentValue, string> = {
	OVEN: 'Four',
	MICROWAVE: 'Micro-ondes',
	BLENDER: 'Blender',
	AIR_FRYER: 'Air fryer',
	KITCHEN_SCALE: 'Balance cuisine',
	COOKTOP: 'Plaque de cuisson'
};

export const recipeKitchenEquipmentOptions: { value: RecipeKitchenEquipmentValue; label: string }[] =
	RECIPE_KITCHEN_EQUIPMENT_VALUES.map((value) => ({
		value,
		label: RECIPE_KITCHEN_EQUIPMENT_LABELS[value]
	}));
