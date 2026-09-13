/**
 * Base MongoDB locale pour le dev (aucun lien avec la prod).
 * Persiste les données dans .mongo-data/ (gitignoré) entre les redémarrages.
 *
 * Usage : node scripts/dev-mongo.mjs
 * Puis pointer DATABASE_URL vers l'URI affichée (mongodb://127.0.0.1:27019/thowerapp?...).
 */
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', '.mongo-data');
// Ce CPU n'a pas AVX (requis par MongoDB 5.0+) : on reste en 4.4, qui a besoin
// de libssl1.1 (absente des dépôts récents) — extraite localement, non installée.
const libsslDir = path.join(__dirname, '..', '.mongo-libssl1.1', 'usr', 'lib', 'x86_64-linux-gnu');
process.env.LD_LIBRARY_PATH = [libsslDir, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':');

const replSet = await MongoMemoryReplSet.create({
	binary: { version: '4.4.29' },
	instanceOpts: [{ port: 27019, dbPath, storageEngine: 'wiredTiger', launchTimeout: 60000 }],
	replSet: { count: 1, storageEngine: 'wiredTiger', dbName: 'thowerapp' }
});

const uri = replSet.getUri('thowerapp');
console.log('MongoDB dev démarré.');
console.log('DATABASE_URL=' + uri);

process.on('SIGINT', async () => {
	await replSet.stop();
	process.exit(0);
});
