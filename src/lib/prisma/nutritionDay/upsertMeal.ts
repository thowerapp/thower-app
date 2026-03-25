import { prisma } from '$lib/server';
import type { MealPosition } from '@prisma/client';
import { regenerateShoppingListsOverlappingDay } from '../shoppingList/regenerateOverlappingDay';

export type UpsertMealData = {
	nutritionDayId: string;
	position: MealPosition;
	recipeId?: string | null;
	quantityG?: number | null;
	calcProteinG?: number | null;
	calcCarbsG?: number | null;
	calcFatG?: number | null;
	calcCalories?: number | null;
	isManual?: boolean;
	manualProteinG?: number | null;
	manualCarbsG?: number | null;
	manualFatG?: number | null;
	manualCalories?: number | null;
};

export async function upsertMeal(data: UpsertMealData) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const client = prisma as any;
	if (!client?.meal) {
		throw new Error('Prisma client has no "meal" model. Run: npx prisma generate');
	}
	const payload = {
		nutritionDayId: data.nutritionDayId,
		position: data.position,
		recipeId: data.recipeId ?? undefined,
		quantityG: data.quantityG ?? undefined,
		calcProteinG: data.calcProteinG ?? undefined,
		calcCarbsG: data.calcCarbsG ?? undefined,
		calcFatG: data.calcFatG ?? undefined,
		calcCalories: data.calcCalories ?? undefined,
		isManual: data.isManual ?? false,
		manualProteinG: data.manualProteinG ?? undefined,
		manualCarbsG: data.manualCarbsG ?? undefined,
		manualFatG: data.manualFatG ?? undefined,
		manualCalories: data.manualCalories ?? undefined
	};
	await client.meal.upsert({
		where: { nutritionDayId_position: { nutritionDayId: data.nutritionDayId, position: data.position } },
		create: payload,
		update: payload
	});

	// MAJ auto liste de courses (Lot 6) : régénérer les listes dont la période contient ce jour
	const day = client.nutritionDay?.findUnique
		? await client.nutritionDay.findUnique({ where: { id: data.nutritionDayId }, select: { userId: true, dayIndex: true } })
		: null;
	if (day) {
		await regenerateShoppingListsOverlappingDay(day.userId, day.dayIndex);
	}
}
