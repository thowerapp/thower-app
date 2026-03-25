import { prisma } from '$lib/server';
import type { RecipeCategory } from '@prisma/client';

export type CreateRecipeData = {
	name: string;
	photoUrl?: string | null;
	prepTimeMin?: number | null;
	cookTimeMin?: number | null;
	category: RecipeCategory;
	instructions?: string | null;
	isCustom?: boolean;
	userId?: string | null;
	referenceYieldG?: number | null;
	ingredients?: { name: string; quantityG: number; unit?: string | null; category?: string | null; allergens?: string[] }[];
};

export async function createRecipe(data: CreateRecipeData) {
	const client = prisma as {
		recipe?: {
			create: (args: {
				data: unknown;
			}) => Promise<unknown>;
		};
	};
	if (!client?.recipe) {
		throw new Error('Prisma client has no "recipe" model. Run: npx prisma generate');
	}
	const { ingredients, ...rest } = data;
	return client.recipe.create({
		data: {
			...rest,
			userId: data.userId ?? undefined,
			isCustom: data.isCustom ?? false,
			referenceYieldG: data.referenceYieldG ?? undefined,
			ingredients: ingredients?.length
				? { create: ingredients.map((i) => ({ name: i.name, quantityG: i.quantityG, unit: i.unit ?? undefined, category: i.category ?? undefined, allergens: i.allergens ?? [] })) }
				: undefined
		}
	});
}
