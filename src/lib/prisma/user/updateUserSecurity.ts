import { prisma } from '$lib/server';
import { hashPassword, verifyPasswordStrength } from '$lib/lucia/password';

export const updateUserSecurity = async (
	id: string,
	{ isMfaEnabled, passwordHash }: { isMfaEnabled: boolean; passwordHash?: string | null }
) => {
	try {
		const dataToUpdate: any = { isMfaEnabled };

		// Vérification et hashage du mot de passe si fourni
		if (passwordHash) {
			dataToUpdate.passwordHash = await hashPassword(passwordHash);
		}

		return await prisma.user.update({
			where: { id },
			data: dataToUpdate
		});
	} catch (error) {
		console.error('Error updating user security:', error);
		throw error;
	}
};
