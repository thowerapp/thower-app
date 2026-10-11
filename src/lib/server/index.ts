import { PrismaClient } from '@prisma/client';
import { env } from '$env/dynamic/private';

const databaseUrl = env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error('DATABASE_URL is not set. Add it to your .env file.');
}

export const prisma = new PrismaClient({
	datasources: {
		db: { url: databaseUrl }
	},
	// Tests d'intégration uniquement : expose chaque requête pour mesurer un budget (`countQueries`).
	...(env.PRISMA_COUNT_QUERIES === '1' ? { log: [{ emit: 'event' as const, level: 'query' as const }] } : {})
});
