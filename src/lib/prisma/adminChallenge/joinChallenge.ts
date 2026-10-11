import { prisma } from '$lib/server';

export async function joinChallenge(userId: string, challengeId: string) {
	return prisma.userChallenge.create({
		data: { userId, challengeId }
	});
}
