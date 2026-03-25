import { prisma } from '$lib/server';

export async function joinChallenge(userId: string, challengeId: string) {
	const client = prisma as {
		userChallenge?: {
			create: (args: { data: { userId: string; challengeId: string } }) => Promise<unknown>;
		};
	};
	if (!client?.userChallenge) {
		throw new Error('Prisma client has no "userChallenge" model. Run: npx prisma generate');
	}
	return client.userChallenge.create({
		data: { userId, challengeId }
	});
}
