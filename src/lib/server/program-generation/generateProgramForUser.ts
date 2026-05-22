import type { Prisma } from '@prisma/client';
import { prisma } from '$lib/server';
import { getProgramOfferEntitlements } from '$lib/prisma/transaction/getProgramOfferEntitlements';
import { generateNutritionDaysForUser } from './nutrition/generateNutrition91Days';
import { NUTRITION_SEGMENT_DAYS } from '$lib/nutrition/nutritionPlanConstants';
import { generateShoppingListFromPlanning } from '$lib/prisma/shoppingList/generateFromPlanning';
import { logProgramGenSummary } from './logProgramGenSummary';
import { programGenLog, programGenTrace, programGenWarn, type ProgramGenSource } from './programGenerationLog';

/** Contourne un UserSelect Prisma parfois désynchronisé dans l’IDE (champ absent des types générés en cache). */
type UserNutritionAllocatedRow = { nutritionDaysAllocated: number };

const selectNutritionDaysAllocated = {
	nutritionDaysAllocated: true
} as unknown as Prisma.UserSelect;

/** Le planning est toujours généré en 3 repas/jour (J1..J91). */
function expectedMealCount(): number {
	return 3;
}

async function resolveTargetNutritionDays(userId: string): Promise<number> {
	const user = (await prisma.user.findUnique({
		where: { id: userId },
		select: selectNutritionDaysAllocated
	})) as UserNutritionAllocatedRow | null;
	const allocated = user?.nutritionDaysAllocated ?? 0;
	programGenLog('3a/ User.nutritionDaysAllocated', { userId, allocated });

	if (allocated > 0 && allocated >= NUTRITION_SEGMENT_DAYS) {
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
	const target = Math.max(NUTRITION_SEGMENT_DAYS, allocated, legacyMax);
	programGenLog('3c/ targetDays retenu', { userId, target });
	return target;
}

/**
 * Vérifie que chaque jour 1..targetDays a le nombre de repas attendu.
 */
async function isNutritionPlanComplete(userId: string, targetDays: number): Promise<boolean> {
	if (targetDays < 1) return true;

	const expected = expectedMealCount();
	programGenLog('4a/ Complétude — repas attendus par jour', {
		userId,
		targetDays,
		intermittentFastingMorning: null,
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

/** Initialise programStartDate si absente (sport seul ou nutrition + sport). */
export async function ensureProgramStartDate(userId: string): Promise<void> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { programStartDate: true }
	});
	if (user?.programStartDate != null) {
		programGenLog('8/ programStartDate inchangée (déjà définie)', {
			userId,
			programStartDate: user.programStartDate.toISOString?.() ?? user.programStartDate
		});
		return;
	}
	const start = new Date();
	start.setUTCHours(0, 0, 0, 0);
	await prisma.user.update({
		where: { id: userId },
		data: { programStartDate: start }
	});
	programGenLog('8/ programStartDate initialisée', { userId, programStartDate: start.toISOString() });
}

/**
 * Génère le planning nutrition sur la plage allouée (paiements cumulables).
 * Idempotent : ne refait pas les jours déjà complets.
 */
export async function generateProgramForUser(
	userId: string,
	source: ProgramGenSource = 'internal'
): Promise<void> {
	programGenTrace('generate_start', { userId, source });
	programGenLog('2/ generateProgramForUser — début', { userId, source });

	try {
		const entitlements = await getProgramOfferEntitlements(userId);
		if (!entitlements.nutrition) {
			programGenTrace('generate_skip_no_nutrition', { userId, source, entitlements });
			programGenLog('2a/ Pas de droit nutrition — génération nutrition ignorée', { userId, entitlements });
			if (entitlements.sport) {
				await ensureProgramStartDate(userId);
				await logProgramGenSummary(userId, 'skipped', { source, reason: 'sport_only_no_nutrition' });
			}
			return;
		}

		const targetDays = await resolveTargetNutritionDays(userId);

		if (targetDays < 1) {
			programGenTrace('generate_abort', {
				userId,
				source,
				reason: 'targetDays_lt_1',
				targetDays
			});
			programGenWarn(
				'ABORT — targetDays < 1 : aucune génération. Augmenter User.nutritionDaysAllocated (webhook paiement) ou créer des NutritionDay.',
				{ userId, targetDays }
			);
			await logProgramGenSummary(userId, 'aborted', { source, targetDays });
			return;
		}

		if (await isNutritionPlanComplete(userId, targetDays)) {
			programGenTrace('generate_skip_complete', { userId, source, targetDays });
			programGenLog('5/ Planning déjà complet — vérification liste de courses', { userId, targetDays });
			// Le plan est complet mais la liste de courses n'existe peut-être pas encore
			// (cas : programme généré avant l'ajout de la fonctionnalité).
			const existingList = await (prisma as any).shoppingList?.findFirst({ where: { userId } });
			if (!existingList) {
				programGenLog('5b/ Aucune liste de courses — génération rattrapée', { userId, targetDays });
				const shoppingResult = await generateShoppingListFromPlanning(userId, 1, targetDays, {
					includeReportedFromPrevious: false
				});
				programGenLog('5c/ Liste de courses rattrapée', { userId, listId: shoppingResult?.listId ?? null });
				await logProgramGenSummary(userId, 'shopping_only', { source, targetDays });
			} else {
				programGenLog('5b/ Liste de courses déjà présente — sortie', { userId });
				await logProgramGenSummary(userId, 'already_complete', { source, targetDays });
			}
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
			await ensureProgramStartDate(userId);
		} else {
			programGenLog('8/ programStartDate inchangée (déjà définie)', {
				userId,
				programStartDate: user?.programStartDate?.toISOString?.() ?? user?.programStartDate
			});
		}

		programGenLog('9/ generateProgramForUser — fin OK', { userId, targetDays });
		await logProgramGenSummary(userId, 'created', { source, targetDays });
	} catch (err) {
		programGenWarn('ERREUR generateProgramForUser', { userId, err });
		throw err;
	}
}
