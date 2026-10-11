import { afterAll, beforeAll, beforeEach } from 'vitest';
import { env } from '$env/dynamic/private';
import { prisma } from '$lib/server';
import { assertLocalTestDatabase } from './guard';
import { resetDatabase } from './db';

// Garde-fou sur l'URL réellement lue par l'application, avant toute écriture.
assertLocalTestDatabase(env.DATABASE_URL ?? '');

beforeAll(async () => {
	await prisma.$connect();
});

beforeEach(async () => {
	await resetDatabase();
});

afterAll(async () => {
	await prisma.$disconnect();
});
