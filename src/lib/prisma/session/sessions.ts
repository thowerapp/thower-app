import { prisma } from '$lib/server';
import { ObjectId } from 'mongodb';

export const createSessionInDB = async (data: {
	id: string;
	userId: string;
	expiresAt: Date;
	twoFactorVerified: boolean;
	oauthProvider?: string | null;
}) => {
	return await prisma.session.create({
		data
	});
};

export const deleteSession = async (sessionId: string) => {
	return await prisma.session.delete({
		where: { id: sessionId }
	});
};

export const deleteSessionsByUserId = async (userId: string) => {
	return await prisma.session.deleteMany({
		where: { userId }
	});
};

export const verifyTwoFactorForSession = async (sessionId: string) => {
	const updatedSession = await prisma.session.update({
		where: { id: sessionId },
		data: { twoFactorVerified: true }
	});
	// console.log('[prisma/session] Session mise à jour pour 2FA:', updatedSession);
	return updatedSession;
};

export const resetTwoFactorVerificationForUser = async (userId: string) => {
	return await prisma.session.updateMany({
		where: { userId: new ObjectId(userId).toString() }, // Convertit userId en ObjectId et le stringify
		data: { twoFactorVerified: false } // Réinitialise la vérification à deux facteurs
	});
};
