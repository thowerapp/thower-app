/**
 * Serveur des tests Playwright : base MongoDB éphémère (replica set) + application en mode dev,
 * avec l'environnement factice de e2e/env/.env (jamais le .env racine : aucun service réel).
 *
 * Lancé par playwright.config.ts (webServer). Port de l'app : 4380 ; base : 127.0.0.1:27037/thower_e2e.
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { MongoClient } from 'mongodb';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { parseSchemaIndexes } from '../../src/lib/server/testing/integration/schemaIndexes';
import { E2E_APP_PORT, E2E_DATABASE_URL, E2E_MONGO_PORT, assertE2eDatabase } from './config';

const root = process.cwd();

function readEnvFile(file: string): Record<string, string> {
	const env: Record<string, string> = {};
	for (const line of readFileSync(file, 'utf8').split('\n')) {
		const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
		if (m) env[m[1]] = m[2];
	}
	return env;
}

assertE2eDatabase(E2E_DATABASE_URL);

const replSet = await MongoMemoryReplSet.create({
	binary: { version: process.env.MONGOMS_VERSION ?? '7.0.14' },
	instanceOpts: [{ port: E2E_MONGO_PORT, launchTimeout: 60_000 }],
	replSet: { name: 'e2eset', count: 1, storageEngine: 'wiredTiger' }
});

const client = new MongoClient(E2E_DATABASE_URL);
await client.connect();
const db = client.db();
const schema = readFileSync(path.join(root, 'prisma', 'schema.prisma'), 'utf8');
for (const { name, indexes } of parseSchemaIndexes(schema)) {
	await db.createCollection(name);
	if (indexes.length > 0) await db.collection(name).createIndexes(indexes);
}
await client.close();

// Les variables du processus priment sur tout fichier .env : l'app ne peut voir que ces valeurs factices.
const fakeEnv = readEnvFile(path.join(root, 'e2e', 'env', '.env'));
const app = spawn(
	path.join(root, 'node_modules', '.bin', 'vite'),
	['dev', '--port', String(E2E_APP_PORT), '--strictPort'],
	{
		cwd: root,
		stdio: 'inherit',
		env: { ...process.env, ...fakeEnv, THOWER_ENV_DIR: 'e2e/env', DATABASE_URL: E2E_DATABASE_URL }
	}
);

async function shutdown(code = 0) {
	app.kill('SIGTERM');
	await replSet.stop();
	process.exit(code);
}
app.on('exit', (code) => void shutdown(code ?? 1));
process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
