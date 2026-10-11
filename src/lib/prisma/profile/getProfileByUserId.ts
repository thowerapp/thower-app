import type { UserProfile } from '@prisma/client';
import { prisma } from '$lib/server';

export type UserProfileSnapshot = UserProfile;

export async function getProfileByUserId(userId: string): Promise<UserProfileSnapshot | null> {
	return prisma.userProfile.findUnique({ where: { userId } });
}
