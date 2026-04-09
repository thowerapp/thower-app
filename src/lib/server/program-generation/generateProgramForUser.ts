import type { Prisma } from '@prisma/client';
import { prisma } from '$lib/server';
import { generateNutritionDaysForUser } from './nutrition/generateNutrition91Days';
import { generateShoppingListFromPlanning } from '$lib/prisma/shoppingList/generateFromPlanning';
import { programGenLog, programGenWarn } from './programGenerationLog';

/** Contourne un UserSelect Prisma parfois désynchronisé dans l’IDE (champ absent des types générés en cache). */
type UserNutritionAllocatedRow = { nutritionDaysAllocated: number };

const selectNutritionDaysAllocated = {
	nutritionDaysAllocated: true
} as unknown as Prisma.UserSelect;

/** Aligné sur generateNutritionDaysForUser : jeûne intermittent matin → 3 repas (30/35/35), sinon 2 (50/50). */
function expectedMealCount(intermittentFastingMorning: boolean): number {
	return intermittentFastingMorning ? 3 : 2;
}

async function resolveTargetNutritionDays(userId: string): Promise<number> {
	const user = (await prisma.user.findUnique({
		where: { id: userId },
		select: selectNutritionDaysAllocated
	})) as UserNutritionAllocatedRow | null;
	const allocated = user?.nutritionDaysAllocated ?? 0;
	programGenLog('3a/ User.nutritionDaysAllocated', { userId, allocated });

	if (allocated > 0) {
		programGenLog('3b/ Cible = allocation (paiements)', { userId, targetDays: allocated });
		return allocated;
	}

	const agg = await prisma.nutritionDay.aggregate({
		where: { userId },
		_max: { dayIndex: true }
	});
	const legacyMax = agg._max.dayIndex ?? 0;
	programGenLog('3b/ Pas d’allocation : repli max(dayIndex) NutritionDay existants', {
		userId,
		legacyMax
	});
	const target = legacyMax;
	programGenLog('3c/ targetDays retenu', { userId, target });
	return target;
}

/**
 * Vérifie que chaque jour 1..targetDays a le nombre de repas attendu.
 */
async function isNutritionPlanComplete(userId: string, targetDays: number): Promise<boolean> {
	if (targetDays < 1) return true;

	const profile = await prisma.userProfile.findUnique({
		where: { userId },
		select: { intermittentFastingMorning: true }
	});
	const ifMorning = profile?.intermittentFastingMorning === true;
	const expected = expectedMealCount(ifMorning);
	programGenLog('4a/ Complétude — repas attendus par jour', {
		userId,
		targetDays,
		intermittentFastingMorning: ifMorning,
		expectedMealsPerDay: expected
	});

	const days = await prisma.nutritionDay.findMany({
		where: { userId, dayIndex: { lte: targetDays } },
		include: { meals: true }
	});
	const byIndex = new Map(days.map((d) => [d.dayIndex, d]));
	programGenLog('4b/ NutritionDay chargés pour contrôle', {
		userId,
		rows: days.length,
		dayIndexesSample: days.slice(0, 5).map((d) => ({
			dayIndex: d.dayIndex,
			mealCount: d.meals.length
		}))
	});

	for (let i = 1; i <= targetDays; i++) {
		const d = byIndex.get(i);
		if (!d || d.meals.length < expected) {
			programGenLog('4c/ Planning incomplet — premier écart', {
				userId,
				dayIndex: i,
				reason: !d ? 'NutritionDay manquant' : `repas ${d.meals.length} < ${expected}`
			});
			return false;
		}
	}
	programGenLog('4c/ Planning déjà complet sur 1..targetDays', { userId, targetDays });
	return true;
}

/**
 * Génère le planning nutrition sur la plage allouée (paiements cumulables).
 * Idempotent : ne refait pas les jours déjà complets.
 */
export async function generateProgramForUser(userId: string): Promise<void> {
	programGenLog('2/ generateProgramForUser — début', { userId });

	try {
		const targetDays = await resolveTargetNutritionDays(userId);

		if (targetDays < 1) {
			programGenWarn(
				'ABORT — targetDays < 1 : aucune génération. Augmenter User.nutritionDaysAllocated (webhook paiement) ou créer des NutritionDay.',
				{ userId, targetDays }
			);
			return;
		}

		if (await isNutritionPlanComplete(userId, targetDays)) {
			programGenLog('5/ Sortie sans écriture : déjà complet', { userId, targetDays });
			return;
		}

		programGenLog('6/ Appel generateNutritionDaysForUser', { userId, targetDays });
		await generateNutritionDaysForUser(userId, targetDays);
		programGenLog('7/ generateNutritionDaysForUser terminé', { userId, targetDays });

		programGenLog('7b/ Génération liste de courses (jours 1..targetDays)', { userId, targetDays });
		const shoppingResult = await generateShoppingListFromPlanning(userId, 1, targetDays, {
			includeReportedFromPrevious: false
		});
		programGenLog('7c/ Liste de courses générée', { userId, listId: shoppingResult?.listId ?? null });

		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { programStartDate: true }
		});
		if (user && user.programStartDate == null) {
			const start = new Date();
			start.setUTCHours(0, 0, 0, 0);
			await prisma.user.update({
				where: { id: userId },
				data: { programStartDate: start }
			});
			programGenLog('8/ programStartDate initialisée', { userId, programStartDate: start.toISOString() });
		} else {
			programGenLog('8/ programStartDate inchangée (déjà définie)', {
				userId,
				programStartDate: user?.programStartDate?.toISOString?.() ?? user?.programStartDate
			});
		}

		programGenLog('9/ generateProgramForUser — fin OK', { userId, targetDays });
	} catch (err) {
		programGenWarn('ERREUR generateProgramForUser', { userId, err });
		throw err;
	}
}
