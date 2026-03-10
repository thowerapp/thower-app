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

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		return fail(401, { message: 'Unauthorized' });
	}

	const userFetched = await getUsersById(params.id);
	if (!userFetched) {
		return fail(404, { message: 'User not found' });
	}

	const userSelected = serializeData(userFetched);
	const initialData = {
		id: userSelected.id,
		email: userSelected.email ?? '',
		username: userSelected.username ?? null,
		name: userSelected.name ?? null,
		picture: userSelected.picture ?? null,
		role: userSelected.role || 'CLIENT',
		isMfaEnabled: userSelected.isMfaEnabled ?? false,
		emailVerified: userSelected.emailVerified ?? false,
		subscriptionEndsAt: toDatetimeLocal(userSelected.subscriptionEndsAt) ?? null,
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
