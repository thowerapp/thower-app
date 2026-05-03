import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { prisma } from '$lib/server';

const CATEGORIES = ['BREAKFAST', 'MEAL', 'DESSERT'] as const;
type CategoryValue = (typeof CATEGORIES)[number];

function parseOptionalNumber(raw: FormDataEntryValue | null): number | null {
	if (typeof raw !== 'string') return null;
	const value = Number.parseFloat(raw.replace(',', '.').trim());
	return Number.isFinite(value) ? value : null;
}

function parseOptionalInt(raw: FormDataEntryValue | null): number | null {
	if (typeof raw !== 'string') return null;
	const value = Number.parseInt(raw.trim(), 10);
	return Number.isInteger(value) ? value : null;
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/auth/login');
	}

	return {
		categories: CATEGORIES
	};
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		if (!locals.user) {
			throw redirect(302, '/auth/login');
		}

		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		const categoryRaw = String(data.get('category') ?? '').trim().toUpperCase();
		const category = CATEGORIES.includes(categoryRaw as CategoryValue)
			? (categoryRaw as CategoryValue)
			: null;

		if (name.length < 2) {
			return fail(400, { error: 'Le nom de recette est trop court.' });
		}
		if (!category) {
			return fail(400, { error: 'Catégorie invalide.' });
		}

		const descriptionRaw = String(data.get('description') ?? '').trim();
		const instructionsRaw = String(data.get('instructions') ?? '').trim();
		const servingsRaw = parseOptionalInt(data.get('servings'));
		const totalTimeRaw = parseOptionalInt(data.get('totalTimeMin'));
		const referenceYieldRaw = parseOptionalNumber(data.get('referenceYieldG'));
		const kcalRaw = parseOptionalNumber(data.get('nutritionKcal'));
		const proteinRaw = parseOptionalNumber(data.get('nutritionProteinG'));
		const carbsRaw = parseOptionalNumber(data.get('nutritionCarbsG'));
		const fatRaw = parseOptionalNumber(data.get('nutritionFatG'));
		const fiberRaw = parseOptionalNumber(data.get('nutritionFiberG'));

		await prisma.recipe.create({
			data: {
				name,
				description: descriptionRaw.length > 0 ? descriptionRaw : null,
				instructions: instructionsRaw.length > 0 ? instructionsRaw : null,
				category,
				totalTimeMin: totalTimeRaw != null && totalTimeRaw > 0 ? totalTimeRaw : null,
				servings: servingsRaw != null && servingsRaw > 0 ? servingsRaw : 1,
				referenceYieldG: referenceYieldRaw != null && referenceYieldRaw > 0 ? referenceYieldRaw : null,
				nutritionKcal: kcalRaw != null && kcalRaw >= 0 ? kcalRaw : null,
				nutritionProteinG: proteinRaw != null && proteinRaw >= 0 ? proteinRaw : null,
				nutritionCarbsG: carbsRaw != null && carbsRaw >= 0 ? carbsRaw : null,
				nutritionFatG: fatRaw != null && fatRaw >= 0 ? fatRaw : null,
				nutritionFiberG: fiberRaw != null && fiberRaw >= 0 ? fiberRaw : null,
				isCustom: true,
				userId: locals.user.id,
				active: true
			}
		});

		throw redirect(303, '/user/nutrition/recettes');
	}
};
