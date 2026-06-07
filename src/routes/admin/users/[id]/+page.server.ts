import type { PageServerLoad } from './$types';
import { type Actions, type RequestEvent } from '@sveltejs/kit';
import type { Prisma } from '@prisma/client';
import { superValidate, fail, message } from 'sveltekit-superforms';
import { zod } from '$lib/superforms-zod';
import { adminUpdateUserSchema, type AdminUpdateUser } from '$lib/schema/users/userSchema';
import { getUsersById } from '$lib/prisma/user/user';
import { serializeData } from '$lib/utils/serializeData';
import { prisma } from '$lib/server';
import { hashPassword } from '$lib/lucia/password';
import { dispatchProgramGeneration } from '$lib/server/program-generation/dispatchProgramGeneration';
import { regenerateFutureProgramForUser } from '$lib/server/program-generation/regenerateFutureProgramForUser';
import {
	adminBodyMeasurementDeleteSchema,
	adminBodyMeasurementSchema,
	adminDailyTaskCompletionSchema,
	adminDailyTaskOptOutSchema,
	adminMealSchema,
	adminMonthlyCheckInSchema,
	adminNutritionDaySchema,
	adminPointEventSchema,
	adminProgramDayItemCompletionSchema,
	adminProgramSettingsSchema,
	adminProgressPhotoSchema,
	adminUserBadgeSchema,
	adminUserChallengeSchema,
	adminUserProfileSchema,
	adminVideoProgressSchema,
	adminWorkoutDaySchema
} from '$lib/schema/admin/adminUserEditionSchema';

function toDatetimeLocal(isoOrNull: string | null | undefined): string | null {
	if (!isoOrNull || typeof isoOrNull !== 'string') return null;
	return isoOrNull.slice(0, 16);
}

function formDataToObject(formData: FormData): Record<string, FormDataEntryValue | FormDataEntryValue[]> {
	const data: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};
	for (const key of new Set(formData.keys())) {
		const values = formData.getAll(key);
		data[key] = values.length > 1 ? values : values[0] ?? '';
	}
	return data;
}

function toDate(value: string | null | undefined): Date | null {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function parseJsonFormValue(value: FormDataEntryValue | null): Prisma.InputJsonValue | undefined {
	if (typeof value !== 'string' || value.trim() === '') return undefined;
	try {
		return JSON.parse(value) as Prisma.InputJsonValue;
	} catch {
		return undefined;
	}
}

function normalizeForCompare(value: unknown): unknown {
	if (value == null || value === '') return null;
	if (Array.isArray(value)) return value.map(String).sort();
	if (value instanceof Date) return value.toISOString();
	return value;
}

function differs(a: unknown, b: unknown): boolean {
	return JSON.stringify(normalizeForCompare(a)) !== JSON.stringify(normalizeForCompare(b));
}

async function dispatchAdminFutureRegeneration(event: RequestEvent, userId: string) {
	return dispatchProgramGeneration(event, async () => {
		await regenerateFutureProgramForUser(userId, 'admin');
	});
}

export const load: PageServerLoad = async ({ params }) => {

	const includeRelations = {
		profile: true,
		bodyMeasurements: { orderBy: { createdAt: 'desc' as const }, take: 50 },
		transactions: { orderBy: { createdAt: 'desc' as const }, take: 20 },
		sessions: true,
		workoutDays: { orderBy: { dayIndex: 'asc' as const }, take: 400, include: { session: true } },
		pointEvents: { orderBy: { createdAt: 'desc' as const }, take: 30 },
		progressPhotos: true,
		userBadges: { include: { badge: true } },
		favoriteRecipes: { include: { recipe: { select: { id: true, name: true } } } },
		recipes: { where: { isCustom: true }, take: 20 },
		nutritionDays: {
			orderBy: { dayIndex: 'asc' as const },
			take: 400,
			include: {
				meals: {
					select: {
						id: true,
						position: true,
						recipeId: true,
						eatenAt: true,
						quantityG: true,
						calcProteinG: true,
						calcCarbsG: true,
						calcFatG: true,
						calcCalories: true,
						calcFiberG: true,
						isManual: true,
						manualProteinG: true,
						manualCarbsG: true,
						manualFatG: true,
						manualCalories: true,
						manualFiberG: true,
						recipe: { select: { name: true } }
					}
				}
			}
		},
		shoppingLists: { take: 20, include: { items: true } },
		dailyTaskCompletions: { orderBy: { completedAt: 'desc' as const }, take: 20, include: { task: true } },
		dailyTaskOptOuts: { include: { task: true } },
		videoProgress: { take: 100, include: { workoutVideo: true, discoveryContent: true } },
		monthlyCheckIns: { orderBy: { month: 'asc' as const } },
		programDayItemCompletions: { take: 200, include: { item: true } },
		pushSubscriptions: { take: 20 },
		challenges: { include: { challenge: true } }
	};
	const [userFetched, recipeCatalog, dailyTasks, badges, programDayItems, adminChallenges] = await Promise.all([
		prisma.user.findUnique({
			where: { id: params.id },
			include: includeRelations as Parameters<typeof prisma.user.findUnique>[0]['include']
		}),
		prisma.recipe.findMany({
			where: { active: true },
			select: { id: true, name: true, category: true, isCustom: true },
			orderBy: { name: 'asc' }
		}),
		prisma.dailyTask.findMany({ orderBy: { order: 'asc' } }),
		prisma.badge.findMany({ orderBy: { name: 'asc' } }),
		prisma.programDayItem.findMany({ take: 400, orderBy: [{ programDayId: 'asc' }, { order: 'asc' }] }),
		prisma.adminChallenge.findMany({ orderBy: { startAt: 'desc' } })
	]);
	if (!userFetched) {
		return fail(404, { message: 'User not found' });
	}

	const raw = serializeData(userFetched) as Record<string, unknown>;
	// Ne pas exposer les secrets côté client
	const userSelected = { ...raw };
	if (userSelected.passwordHash) userSelected.passwordHash = '[REDACTED]';
	if (userSelected.recoveryCode) userSelected.recoveryCode = '[REDACTED]';
	if (userSelected.totpKey) userSelected.totpKey = '[REDACTED]';
	// Garantir que les relations sont bien présentes (éviter perte à la sérialisation)
	userSelected.profile = raw.profile ?? null;
	userSelected.bodyMeasurements = raw.bodyMeasurements ?? [];
	userSelected.transactions = raw.transactions ?? [];
	userSelected.sessions = raw.sessions ?? [];
	userSelected.workoutDays = raw.workoutDays ?? [];
	userSelected.pointEvents = raw.pointEvents ?? [];
	userSelected.progressPhotos = raw.progressPhotos ?? [];
	userSelected.userBadges = raw.userBadges ?? [];
	userSelected.favoriteRecipes = raw.favoriteRecipes ?? [];
	userSelected.recipes = raw.recipes ?? [];
	// Garantir la structure meals[].recipe.name pour le calendrier (éviter perte à la sérialisation)
	const rawNutrition = raw.nutritionDays as Array<{ meals?: Array<{ position?: string; recipe?: { name?: string } | null }> }> | null | undefined;
	userSelected.nutritionDays = rawNutrition?.map((nd) => ({
		...nd,
		meals: (nd?.meals ?? []).map((m) => ({
			...m,
			recipe: m?.recipe ?? null
		}))
	})) ?? [];

	// Logs serveur : vérification des données envoyées au calendrier
	const nutritionDays = userSelected.nutritionDays as Array<{ dayIndex?: number; meals?: Array<{ position?: string; recipe?: { name?: string } | null }> }> | undefined;
	const ndCount = nutritionDays?.length ?? 0;
	const ndWithMeals = nutritionDays?.filter((nd: { meals?: unknown[] }) => (nd?.meals?.length ?? 0) > 0).length ?? 0;
	const sampleNd = nutritionDays?.[0];
	const sampleMeals = sampleNd?.meals?.map((m: { position?: string; recipe?: { name?: string } | null }) => ({ position: m?.position, recipeName: m?.recipe?.name })) ?? [];
	console.log('[admin/user load] workoutDays:', (userSelected.workoutDays as unknown[] | undefined)?.length ?? 0);
	console.log('[admin/user load] nutritionDays:', ndCount, '| avec repas:', ndWithMeals);
	if (sampleNd) {
		console.log('[admin/user load] exemple J' + sampleNd.dayIndex + ' repas:', sampleMeals);
	}
	userSelected.shoppingLists = raw.shoppingLists ?? [];
	userSelected.dailyTaskCompletions = raw.dailyTaskCompletions ?? [];
	userSelected.dailyTaskOptOuts = raw.dailyTaskOptOuts ?? [];
	userSelected.videoProgress = raw.videoProgress ?? [];
	userSelected.monthlyCheckIns = raw.monthlyCheckIns ?? [];
	userSelected.programDayItemCompletions = raw.programDayItemCompletions ?? [];
	userSelected.pushSubscriptions = raw.pushSubscriptions ?? [];
	userSelected.challenges = raw.challenges ?? [];
	const initialData = {
		id: userSelected.id,
		email: userSelected.email ?? '',
		username: userSelected.username ?? null,
		name: userSelected.name ?? null,
		picture: userSelected.picture ?? null,
		role: userSelected.role || 'CLIENT',
		isMfaEnabled: userSelected.isMfaEnabled ?? false,
		emailVerified: userSelected.emailVerified ?? false,
		subscriptionEndsAt: toDatetimeLocal(userSelected.subscriptionEndsAt as string | null) ?? null,
		passwordHash: null as string | null
	};

	const formSchema = await superValidate(initialData, zod(adminUpdateUserSchema));

	return {
		formSchema,
		userSelected,
		adminOptions: serializeData({
			recipeCatalog,
			dailyTasks,
			badges,
			programDayItems,
			adminChallenges
		})
	};
};

export const actions: Actions = {
	pauseProgram: async ({ request, params }) => {
		const formData = await request.formData();
		const reason = String(formData.get('reason') ?? '').trim() || null;
		try {
			await prisma.user.update({
				where: { id: params.id },
				data: { programPausedAt: new Date(), programPausedReason: reason }
			});
			return { success: true };
		} catch (error) {
			console.error('[admin] pauseProgram error:', error);
			return fail(500, { message: 'Erreur lors de la pause du programme' });
		}
	},

	resumeProgram: async ({ params }) => {
		try {
			await prisma.user.update({
				where: { id: params.id },
				data: { programPausedAt: null, programPausedReason: null }
			});
			return { success: true };
		} catch (error) {
			console.error('[admin] resumeProgram error:', error);
			return fail(500, { message: 'Erreur lors de la reprise du programme' });
		}
	},

	updateProgramSettings: async (event) => {
		const formData = await event.request.formData();
		const parsed = adminProgramSettingsSchema.safeParse(formDataToObject(formData));
		if (!parsed.success) return fail(400, { message: parsed.error.errors[0]?.message ?? 'Données invalides' });

		const data = parsed.data;
		const current = await prisma.user.findUnique({
			where: { id: data.id },
			select: {
				nutritionDaysAllocated: true,
				programStartDate: true,
				photoValidationStatus: true,
				photoValidatedAt: true,
				profile: {
					select: {
						bodyFatPercent: true,
						weightLossGoalKg: true
					}
				}
			}
		});
		if (!current) return fail(404, { message: 'User not found' });

		const nextProgramStartDate = toDate(data.programStartDate);
		const affectsProgram =
			current.nutritionDaysAllocated !== data.nutritionDaysAllocated ||
			differs(current.programStartDate, nextProgramStartDate) ||
			differs(current.profile?.bodyFatPercent, data.bodyFatPercent) ||
			differs(current.profile?.weightLossGoalKg, data.weightLossGoalKg);
		if (affectsProgram && data.confirmRegenerate !== '1') {
			return fail(400, { message: 'Confirmation de régénération requise' });
		}

		await prisma.user.update({
			where: { id: data.id },
			data: {
				nutritionDaysAllocated: data.nutritionDaysAllocated,
				programStartDate: nextProgramStartDate,
				photoValidationStatus: data.photoValidationStatus,
				photoValidatedAt: toDate(data.photoValidatedAt)
			}
		});
		await prisma.userProfile.upsert({
			where: { userId: data.id },
			create: {
				userId: data.id,
				bodyFatPercent: data.bodyFatPercent,
				weightLossGoalKg: data.weightLossGoalKg
			},
			update: {
				bodyFatPercent: data.bodyFatPercent,
				weightLossGoalKg: data.weightLossGoalKg
			}
		});

		const dispatchMode = affectsProgram ? await dispatchAdminFutureRegeneration(event, data.id) : null;
		return { success: true, regenerated: affectsProgram, dispatchMode };
	},

	updateProfile: async (event) => {
		const formData = await event.request.formData();
		const parsed = adminUserProfileSchema.safeParse(formDataToObject(formData));
		if (!parsed.success) return fail(400, { message: parsed.error.errors[0]?.message ?? 'Profil invalide' });

		const data = parsed.data;
		const current = await prisma.userProfile.findUnique({ where: { userId: data.id } });
		const programFields = [
			'breakfastEnabled',
			'intermittentFastingMorning',
			'allergens',
			'otherAllergens',
			'disgustingFoods',
			'bodyFatPercent',
			'breadDaily',
			'breadGramsPerDay',
			'breadType'
		] as const;
		const affectsProgram =
			!current || programFields.some((field) => differs(current[field], data[field]));
		if (affectsProgram && data.confirmRegenerate !== '1') {
			return fail(400, { message: 'Confirmation de régénération requise' });
		}

		const { id, confirmRegenerate: _confirmRegenerate, ...profileData } = data;
		const profileWriteData = {
			...profileData,
			familyCoefficients: profileData.familyCoefficients as Prisma.InputJsonValue | undefined
		};
		await prisma.userProfile.upsert({
			where: { userId: id },
			create: { userId: id, ...profileWriteData },
			update: profileWriteData
		});

		const dispatchMode = affectsProgram ? await dispatchAdminFutureRegeneration(event, id) : null;
		return { success: true, regenerated: affectsProgram, dispatchMode };
	},

	upsertBodyMeasurement: async (event) => {
		const formData = await event.request.formData();
		const parsed = adminBodyMeasurementSchema.safeParse(formDataToObject(formData));
		if (!parsed.success) return fail(400, { message: parsed.error.errors[0]?.message ?? 'Mensuration invalide' });

		const data = parsed.data;
		const userId = event.params.id;
		if (!userId) return fail(400, { message: 'User manquant' });
		if (data.confirmRegenerate !== '1') {
			return fail(400, { message: 'Confirmation de régénération requise' });
		}

		const { id, confirmRegenerate: _confirmRegenerate, createdAt, ...measurementData } = data;
		if (id) {
			await prisma.bodyMeasurement.update({
				where: { id },
				data: {
					...measurementData,
					createdAt: toDate(createdAt) ?? undefined
				}
			});
		} else {
			await prisma.bodyMeasurement.create({
				data: {
					userId,
					...measurementData,
					createdAt: toDate(createdAt) ?? undefined
				}
			});
		}

		const dispatchMode = await dispatchAdminFutureRegeneration(event, userId);
		return { success: true, regenerated: true, dispatchMode };
	},

	deleteBodyMeasurement: async (event) => {
		const formData = await event.request.formData();
		const parsed = adminBodyMeasurementDeleteSchema.safeParse(formDataToObject(formData));
		if (!parsed.success) return fail(400, { message: parsed.error.errors[0]?.message ?? 'Mensuration invalide' });
		if (parsed.data.confirmRegenerate !== '1') {
			return fail(400, { message: 'Confirmation de régénération requise' });
		}
		await prisma.bodyMeasurement.delete({ where: { id: parsed.data.id } });
		const userId = event.params.id;
		if (!userId) return fail(400, { message: 'User manquant' });
		const dispatchMode = await dispatchAdminFutureRegeneration(event, userId);
		return { success: true, regenerated: true, dispatchMode };
	},

	upsertProgressPhoto: async (event) => {
		const formData = await event.request.formData();
		const parsed = adminProgressPhotoSchema.safeParse(formDataToObject(formData));
		if (!parsed.success) return fail(400, { message: parsed.error.errors[0]?.message ?? 'Photo invalide' });
		const userId = event.params.id;
		if (!userId) return fail(400, { message: 'User manquant' });
		const { id, uploadedAt, ...data } = parsed.data;
		if (id) {
			await prisma.progressPhoto.update({
				where: { id },
				data: { ...data, uploadedAt: toDate(uploadedAt) ?? undefined }
			});
		} else {
			await prisma.progressPhoto.create({
				data: { userId, ...data, uploadedAt: toDate(uploadedAt) ?? undefined }
			});
		}
		return { success: true };
	},

	upsertMonthlyCheckIn: async (event) => {
		const formData = await event.request.formData();
		const parsed = adminMonthlyCheckInSchema.safeParse(formDataToObject(formData));
		if (!parsed.success) return fail(400, { message: parsed.error.errors[0]?.message ?? 'Check-in invalide' });
		const userId = event.params.id;
		if (!userId) return fail(400, { message: 'User manquant' });
		const { id, submittedAt, ...data } = parsed.data;
		if (id) {
			await prisma.monthlyCheckIn.update({
				where: { id },
				data: { ...data, submittedAt: toDate(submittedAt) ?? undefined }
			});
		} else {
			await prisma.monthlyCheckIn.upsert({
				where: { userId_month: { userId, month: data.month } },
				create: { userId, ...data, submittedAt: toDate(submittedAt) ?? undefined },
				update: { ...data, submittedAt: toDate(submittedAt) ?? undefined }
			});
		}
		return { success: true };
	},

	updateNutritionDay: async (event) => {
		const formData = await event.request.formData();
		const parsed = adminNutritionDaySchema.safeParse(formDataToObject(formData));
		if (!parsed.success) return fail(400, { message: parsed.error.errors[0]?.message ?? 'Jour nutrition invalide' });
		await prisma.nutritionDay.update({
			where: { id: parsed.data.id },
			data: { intermittentFasting: parsed.data.intermittentFasting }
		});
		return { success: true };
	},

	updateMeal: async (event) => {
		const formData = await event.request.formData();
		const parsed = adminMealSchema.safeParse(formDataToObject(formData));
		if (!parsed.success) return fail(400, { message: parsed.error.errors[0]?.message ?? 'Repas invalide' });
		const { id, eatenAt, ...data } = parsed.data;
		await prisma.meal.update({
			where: { id },
			data: { ...data, eatenAt: toDate(eatenAt) }
		});
		return { success: true };
	},

	updateWorkoutDay: async (event) => {
		const formData = await event.request.formData();
		const parsed = adminWorkoutDaySchema.safeParse(formDataToObject(formData));
		if (!parsed.success) return fail(400, { message: parsed.error.errors[0]?.message ?? 'Séance invalide' });
		const { id, scheduledDate, completedAt, ...data } = parsed.data;
		await prisma.userWorkoutDay.update({
			where: { id },
			data: {
				...data,
				scheduledDate: toDate(scheduledDate),
				completedAt: toDate(completedAt)
			}
		});
		return { success: true };
	},

	upsertPointEvent: async (event) => {
		const formData = await event.request.formData();
		const parsed = adminPointEventSchema.safeParse(formDataToObject(formData));
		if (!parsed.success) return fail(400, { message: parsed.error.errors[0]?.message ?? 'Points invalides' });
		const userId = event.params.id;
		if (!userId) return fail(400, { message: 'User manquant' });
		const { id, createdAt, ...data } = parsed.data;
		const pointEventData = {
			...data,
			metadata: data.metadata as Prisma.InputJsonValue | undefined
		};
		if (id) {
			await prisma.pointEvent.update({
				where: { id },
				data: { ...pointEventData, createdAt: toDate(createdAt) ?? undefined }
			});
		} else {
			await prisma.pointEvent.create({
				data: { userId, ...pointEventData, createdAt: toDate(createdAt) ?? undefined }
			});
		}
		return { success: true };
	},

	updateUserBadge: async (event) => {
		const formData = await event.request.formData();
		const parsed = adminUserBadgeSchema.safeParse(formDataToObject(formData));
		if (!parsed.success) return fail(400, { message: parsed.error.errors[0]?.message ?? 'Badge invalide' });
		await prisma.userBadge.update({
			where: { id: parsed.data.id },
			data: { progress: parsed.data.progress, unlockedAt: toDate(parsed.data.unlockedAt) }
		});
		return { success: true };
	},

	upsertDailyTaskCompletion: async (event) => {
		const formData = await event.request.formData();
		const parsed = adminDailyTaskCompletionSchema.safeParse(formDataToObject(formData));
		if (!parsed.success) return fail(400, { message: parsed.error.errors[0]?.message ?? 'Tâche invalide' });
		const userId = event.params.id;
		if (!userId) return fail(400, { message: 'User manquant' });
		const { id, date, completedAt, ...data } = parsed.data;
		if (id) {
			await prisma.dailyTaskCompletion.update({
				where: { id },
				data: { ...data, date: toDate(date) ?? undefined, completedAt: toDate(completedAt) ?? undefined }
			});
		} else {
			const taskDate = toDate(date) ?? new Date();
			await prisma.dailyTaskCompletion.upsert({
				where: { userId_taskId_date: { userId, taskId: data.taskId, date: taskDate } },
				create: { userId, ...data, date: taskDate, completedAt: toDate(completedAt) ?? undefined },
				update: { completedAt: toDate(completedAt) ?? undefined }
			});
		}
		return { success: true };
	},

	upsertDailyTaskOptOut: async (event) => {
		const formData = await event.request.formData();
		const parsed = adminDailyTaskOptOutSchema.safeParse(formDataToObject(formData));
		if (!parsed.success) return fail(400, { message: parsed.error.errors[0]?.message ?? 'Opt-out invalide' });
		const userId = event.params.id;
		if (!userId) return fail(400, { message: 'User manquant' });
		const { id, taskId } = parsed.data;
		if (id) {
			await prisma.userDailyTaskOptOut.delete({ where: { id } });
		} else {
			await prisma.userDailyTaskOptOut.upsert({
				where: { userId_taskId: { userId, taskId } },
				create: { userId, taskId },
				update: {}
			});
		}
		return { success: true };
	},

	updateVideoProgress: async (event) => {
		const formData = await event.request.formData();
		const parsed = adminVideoProgressSchema.safeParse(formDataToObject(formData));
		if (!parsed.success) return fail(400, { message: parsed.error.errors[0]?.message ?? 'Progression vidéo invalide' });
		const { id, lastHeartbeatAt, completedAt, ...data } = parsed.data;
		await prisma.userVideoProgress.update({
			where: { id },
			data: {
				...data,
				lastHeartbeatAt: toDate(lastHeartbeatAt) ?? undefined,
				completedAt: toDate(completedAt)
			}
		});
		return { success: true };
	},

	upsertProgramDayItemCompletion: async (event) => {
		const formData = await event.request.formData();
		const parsed = adminProgramDayItemCompletionSchema.safeParse(formDataToObject(formData));
		if (!parsed.success) return fail(400, { message: parsed.error.errors[0]?.message ?? 'Validation programme invalide' });
		const userId = event.params.id;
		if (!userId) return fail(400, { message: 'User manquant' });
		const { id, completedAt, ...data } = parsed.data;
		if (id) {
			await prisma.userProgramDayItemCompletion.update({
				where: { id },
				data: { ...data, completedAt: toDate(completedAt) ?? undefined }
			});
		} else {
			await prisma.userProgramDayItemCompletion.upsert({
				where: { userId_programDayItemId: { userId, programDayItemId: data.programDayItemId } },
				create: { userId, ...data, completedAt: toDate(completedAt) ?? undefined },
				update: { stepsValue: data.stepsValue, completedAt: toDate(completedAt) ?? undefined }
			});
		}
		return { success: true };
	},

	updateUserChallenge: async (event) => {
		const formData = await event.request.formData();
		const parsed = adminUserChallengeSchema.safeParse(formDataToObject(formData));
		if (!parsed.success) return fail(400, { message: parsed.error.errors[0]?.message ?? 'Défi invalide' });
		await prisma.userChallenge.update({
			where: { id: parsed.data.id },
			data: { completedAt: toDate(parsed.data.completedAt) }
		});
		return { success: true };
	},

	deleteSession: async (event) => {
		const formData = await event.request.formData();
		const id = String(formData.get('id') ?? '');
		if (!id) return fail(400, { message: 'Session manquante' });
		await prisma.session.delete({ where: { id } });
		return { success: true };
	},

	deletePushSubscription: async (event) => {
		const formData = await event.request.formData();
		const id = String(formData.get('id') ?? '');
		if (!id) return fail(400, { message: 'Subscription manquante' });
		await prisma.pushSubscription.delete({ where: { id } });
		return { success: true };
	},

	upsertFavoriteRecipe: async (event) => {
		const formData = await event.request.formData();
		const userId = event.params.id;
		const recipeId = String(formData.get('recipeId') ?? '');
		const favoriteId = String(formData.get('id') ?? '');
		if (!userId || (!recipeId && !favoriteId)) return fail(400, { message: 'Favori invalide' });
		if (favoriteId) {
			await prisma.userFavoriteRecipe.delete({ where: { id: favoriteId } });
		} else {
			await prisma.userFavoriteRecipe.upsert({
				where: { userId_recipeId: { userId, recipeId } },
				create: { userId, recipeId },
				update: {}
			});
		}
		return { success: true };
	},

	updateShoppingList: async (event) => {
		const formData = await event.request.formData();
		const id = String(formData.get('id') ?? '');
		const startDayIndex = Number(formData.get('startDayIndex') ?? 0);
		const endDayIndex = Number(formData.get('endDayIndex') ?? 0);
		if (!id || !Number.isFinite(startDayIndex) || !Number.isFinite(endDayIndex)) {
			return fail(400, { message: 'Liste de courses invalide' });
		}
		await prisma.shoppingList.update({
			where: { id },
			data: { startDayIndex, endDayIndex }
		});
		return { success: true };
	},

	updateShoppingItem: async (event) => {
		const formData = await event.request.formData();
		const id = String(formData.get('id') ?? '');
		const totalQuantityG = Number(formData.get('totalQuantityG') ?? 0);
		if (!id || !Number.isFinite(totalQuantityG)) return fail(400, { message: 'Article invalide' });
		await prisma.shoppingItem.update({
			where: { id },
			data: {
				ingredientName: String(formData.get('ingredientName') ?? ''),
				category: String(formData.get('category') ?? '') || null,
				totalQuantityG,
				unit: String(formData.get('unit') ?? '') || null,
				isChecked: formData.get('isChecked') === 'on',
				isReported: formData.get('isReported') === 'on',
				sources: parseJsonFormValue(formData.get('sources'))
			}
		});
		return { success: true };
	},

	updateUser: async ({ request }) => {
		const formData = await request.formData();
		const form = await superValidate(formData, zod(adminUpdateUserSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		const data = form.data as AdminUpdateUser;
		const {
			id,
			email,
			username,
			name,
			picture,
			role,
			isMfaEnabled,
			emailVerified,
			subscriptionEndsAt,
			passwordHash
		} = data;

		const user = await getUsersById(String(id));
		if (!user) {
			return fail(404, { message: 'User not found' });
		}

		const updateData: {
			email: string;
			username: string | null;
			name: string | null;
			picture: string | null;
			role: 'ADMIN' | 'CLIENT';
			isMfaEnabled: boolean;
			emailVerified: boolean;
			subscriptionEndsAt: Date | null;
			passwordHash?: string;
		} = {
			email: String(email),
			username: username != null ? String(username) : null,
			name: name != null ? String(name) : null,
			picture: picture != null ? String(picture) : null,
			role,
			isMfaEnabled,
			emailVerified,
			subscriptionEndsAt:
				subscriptionEndsAt != null &&
				typeof subscriptionEndsAt === 'string' &&
				subscriptionEndsAt.trim() !== ''
					? new Date(subscriptionEndsAt)
					: null
		};

		if (passwordHash != null && typeof passwordHash === 'string' && String(passwordHash).trim() !== '') {
			updateData.passwordHash = await hashPassword(passwordHash);
		}

		try {
			await prisma.user.update({
				where: { id },
				data: updateData
			});
			return message(form, 'User updated successfully');
		} catch (error: unknown) {
			console.error('Error updating user:', error);
			const isPrismaError = error && typeof error === 'object' && 'code' in error;
			if (isPrismaError && (error as { code: string }).code === 'P2002') {
				return fail(400, { form, message: 'Email déjà utilisé' as const });
			}
			return fail(500, { message: 'User update failed' as const });
		}
	}
};
