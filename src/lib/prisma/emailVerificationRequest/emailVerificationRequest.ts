import { prisma } from '$lib/server';

export const createEmailVerificationRequestPrisma = async (data: {
	id: string;
	userId: string;
	code: string;
	email: string;
	expiresAt: Date;
}) => {
	return await prisma.emailVerificationRequest.create({
		data
	});
};

export const deleteEmailVerificationRequestsByUserId = async (userId: string) => {
	return await prisma.emailVerificationRequest.deleteMany({
		where: { userId }
	});
};

export const findEmailVerificationRequest = async (id: string, userId: string) => {
	return await prisma.emailVerificationRequest.findUnique({
		where: {
			id: id,
			userId: userId
		}
	});
};
