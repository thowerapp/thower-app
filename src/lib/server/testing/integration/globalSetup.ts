import { readFileSync } from 'node:fs';
import path from 'node:path';
import { MongoClient } from 'mongodb';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { assertLocalTestDatabase } from './guard';
import { parseSchemaIndexes } from './schemaIndexes';

/** Démarre le replica set éphémère et y crée les collections et index du schéma Prisma. */
export default async function setup() {
	const url = process.env.DATABASE_URL ?? '';
	assertLocalTestDatabase(url);

	const replSet = await MongoMemoryReplSet.create({
		binary: { version: process.env.MONGOMS_VERSION ?? '7.0.14' },
		instanceOpts: [{ port: Number(process.env.MONGOMS_PORT), launchTimeout: 60_000 }],
		replSet: { name: 'testset', count: 1, storageEngine: 'wiredTiger' }
	});

	const client = new MongoClient(url);
	try {
		await client.connect();
		const db = client.db();
		const schema = readFileSync(path.join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');
		// Index uniques indispensables aux tests anti-doublons ; `prisma db push` serait trop lent ici.
		for (const { name, indexes } of parseSchemaIndexes(schema)) {
			await db.createCollection(name);
			if (indexes.length > 0) await db.collection(name).createIndexes(indexes);
		}
	} catch (err) {
		await client.close();
		await replSet.stop();
		throw err;
	}
	await client.close();

	return async () => {
		await replSet.stop();
	};
}
