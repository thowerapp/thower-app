import { z } from 'zod';

// Schéma pour la mise à jour d'un utilisateur
const updateUserSchema = z.object({
	id: z.string(),
	name: z.string().min(1, 'Name is required'),
	email: z.string().email('Invalid email format'),
	role: z.string().min(1, 'Role is required')
});

// Schéma pour la suppression d'un utilisateur
const deleteUserSchema = z.object({
	id: z.string()
});

// Schéma admin : mise à jour complète des infos utilisateur
const adminUpdateUserSchema = z.object({
	id: z.string(),
	email: z.string().email('Format email invalide'),
	username: z.string().nullable().optional(),
	name: z.string().nullable().optional(),
	picture: z.string().nullable().optional(),
	role: z.enum(['ADMIN', 'CLIENT']),
	isMfaEnabled: z.boolean(),
	emailVerified: z.boolean(),
	subscriptionEndsAt: z.string().nullable().optional(),
	passwordHash: z.string().nullable().optional()
});

type UpdateUser = z.infer<typeof updateUserSchema>;
type DeleteUser = z.infer<typeof deleteUserSchema>;
type AdminUpdateUser = z.infer<typeof adminUpdateUserSchema>;

export { updateUserSchema, deleteUserSchema, adminUpdateUserSchema };
export type { UpdateUser, DeleteUser, AdminUpdateUser };
