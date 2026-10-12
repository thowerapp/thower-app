/**
 * Fusionne la couverture unitaire, d'intégration et e2e (serveur) au niveau de la ligne.
 * Prérequis : npm run test:coverage:unit, test:coverage:integration, test:coverage:e2e (chacun est facultatif).
 * Sortie : résumé console et coverage/merged-uncovered.txt (lignes non couvertes par fichier).
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { TraceMap, originalPositionFor } from '@jridgewell/trace-mapping';

const root = process.cwd();
const rel = (f) => path.relative(root, f).split(path.sep).join('/');
const inScope = (f) =>
	f.startsWith('src/lib/') || f.startsWith('src/routes/') || f === 'src/hooks.server.ts';
const skip = (f) => /\.(spec|test|d)\.ts$/.test(f) || f.startsWith('src/lib/server/testing/');

const sources = { unit: [], integration: [], e2e: [] };
for (const kind of ['unit', 'integration']) {
	const file = `coverage/${kind}/coverage-final.json`;
	if (existsSync(file)) sources[kind].push(JSON.parse(readFileSync(file, 'utf8')));
}
if (existsSync('coverage/e2e-raw')) {
	for (const f of readdirSync('coverage/e2e-raw'))
		sources.e2e.push(JSON.parse(readFileSync(`coverage/e2e-raw/${f}`, 'utf8')));
}

/** fichier -> ligne -> { unit, integration, e2e } */
const files = new Map();
for (const [kind, list] of Object.entries(sources)) {
	for (const cov of list) {
		for (const [abs, data] of Object.entries(cov)) {
			const f = rel(abs);
			if (!inScope(f) || skip(f)) continue;
			const lines = files.get(f) ?? new Map();
			files.set(f, lines);
			// Les compteurs istanbul de l'e2e sont exprimés dans le code transformé : retour au source d'origine.
			const origin = kind === 'e2e' && data.inputSourceMap ? new TraceMap(data.inputSourceMap) : null;
			for (const [id, loc] of Object.entries(data.statementMap)) {
				const line = origin ? originalPositionFor(origin, { line: loc.start.line, column: loc.start.column }).line : loc.start.line;
				if (line == null) continue;
				const entry = lines.get(line) ?? { unit: false, integration: false, e2e: false, e2eLine: false };
				if (kind === 'e2e') entry.e2eLine = true;
				if (data.s[id] > 0) entry[kind] = true;
				lines.set(line, entry);
			}
		}
	}
}

// Les rapports v8 des fichiers jamais chargés par les tests unitaires placent des lignes fantômes : quand l'e2e
// (instrumenté ligne à ligne) connaît le fichier, ses lignes de code servent de référence.
for (const [f, lines] of files) {
	const known = [...lines.values()].some((e) => e.e2eLine);
	if (!known) continue;
	for (const [n, e] of lines) if (!e.e2eLine) lines.delete(n);
}

const count = (lines, kinds) => {
	let hit = 0;
	for (const e of lines.values()) if (kinds.some((k) => e[k])) hit++;
	return hit;
};
const all = ['unit', 'integration', 'e2e'];
const totals = { total: 0, unit: 0, integration: 0, e2e: 0, merged: 0 };
const rows = [];
for (const [f, lines] of files) {
	totals.total += lines.size;
	for (const k of all) totals[k] += count(lines, [k]);
	const merged = count(lines, all);
	totals.merged += merged;
	rows.push({
		f,
		total: lines.size,
		merged,
		missing: [...lines]
			.filter(([, e]) => !all.some((k) => e[k]))
			.map(([n]) => n)
			.sort((a, b) => a - b)
	});
}

const pct = (n) => (totals.total ? ((100 * n) / totals.total).toFixed(1) : '0.0') + ' %';
console.log(`Fichiers : ${files.size} · lignes de code : ${totals.total}`);
for (const k of all) console.log(`  ${k.padEnd(12)} ${pct(totals[k])}`);
console.log(`  ${'fusionné'.padEnd(12)} ${pct(totals.merged)}`);

const byDir = new Map();
for (const r of rows) {
	const dir = r.f
		.split('/')
		.slice(0, r.f.startsWith('src/routes/') ? 3 : 3)
		.join('/');
	const d = byDir.get(dir) ?? { total: 0, merged: 0 };
	d.total += r.total;
	d.merged += r.merged;
	byDir.set(dir, d);
}
console.log('\nPar dossier (fusionné) :');
for (const [dir, d] of [...byDir]
	.sort((a, b) => b[1].total - b[1].merged - (a[1].total - a[1].merged))
	.slice(0, 25)) {
	console.log(
		`  ${((100 * d.merged) / d.total).toFixed(0).padStart(3)} %  ${String(d.total - d.merged).padStart(5)} manquantes  ${dir}`
	);
}

const out = rows
	.filter((r) => r.missing.length)
	.sort((a, b) => b.missing.length - a.missing.length)
	.map(
		(r) =>
			`${String(r.missing.length).padStart(4)} / ${String(r.total).padStart(4)}  ${r.f}  [${r.missing.join(',')}]`
	);
writeFileSync('coverage/merged-uncovered.txt', out.join('\n') + '\n');
console.log(`\nDétail : coverage/merged-uncovered.txt (${out.length} fichiers incomplets)`);
