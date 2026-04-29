import type { PageServerLoad } from './$types';
import { type Actions } from '@sveltejs/kit';
import { superValidate, fail, message } from 'sveltekit-superforms';
import { zod } from '$lib/superforms-zod';
import { adminUpdateUserSchema, type AdminUpdateUser } from '$lib/schema/users/userSchema';
import { getUsersById } from '$lib/prisma/user/user';
import { serializeData } from '$lib/utils/serializeData';
import { prisma } from '$lib/server';
import { hashPassword } from '$lib/lucia/password';

function toDatetimeLocal(isoOrNull: string | null | undefined): string | null {
	if (!isoOrNull || typeof isoOrNull !== 'string') return null;
	return isoOrNull.slice(0, 16);
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
		recipes: { where: { isCustom: true }, take: 20 },
		nutritionDays: {
			orderBy: { dayIndex: 'asc' as const },
			take: 400,
			include: {
				meals: {
					select: {
						id: true,
						position: true,
						eatenAt: true,
						quantityG: true,
						calcCalories: true,
						recipe: { select: { name: true } }
					}
				}
			}
		},
		shoppingLists: { take: 5 },
		dailyTaskCompletions: { orderBy: { completedAt: 'desc' as const }, take: 20 },
		challenges: { include: { challenge: true } }
	};
	const userFetched = await prisma.user.findUnique({
		where: { id: params.id },
		include: includeRelations as Parameters<typeof prisma.user.findUnique>[0]['include']
	});
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
		userSelected
	};
};

export const actions: Actions = {
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
