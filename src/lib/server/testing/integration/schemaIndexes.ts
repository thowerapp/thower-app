/**
 * Collections et index MongoDB déduits de prisma/schema.prisma, nommés comme `prisma db push`
 * (`<collection>_<champs>_key` pour un index unique, `_idx` sinon). Les tests d'intégration les créent
 * directement : `db push` est trop lent (et se bloque) pour chaque lancement.
 */
export type SchemaIndex = { name: string; key: Record<string, 1>; unique?: true };
export type SchemaCollection = { name: string; indexes: SchemaIndex[] };

const FIELD_LINE = /^\s*(\w+)\s+\S+/;

function fieldList(raw: string): string[] {
	return raw
		.split(',')
		.map((f) => f.trim().split(/[\s(]/)[0])
		.filter(Boolean);
}

export function parseSchemaIndexes(schema: string): SchemaCollection[] {
	const collections: SchemaCollection[] = [];
	for (const match of schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
		const [, modelName, body] = match;
		const lines = body.split('\n').map((l) => l.replace(/\/\/.*$/, ''));
		const collection = /@@map\("([^"]+)"\)/.exec(body)?.[1] ?? modelName;

		// Nom en base de chaque champ (`@map`), hors relations.
		const dbName = new Map<string, string>();
		for (const line of lines) {
			const field = FIELD_LINE.exec(line)?.[1];
			if (!field || line.trim().startsWith('@@')) continue;
			dbName.set(field, /@map\("([^"]+)"\)/.exec(line)?.[1] ?? field);
		}
		const toKey = (fields: string[]) =>
			Object.fromEntries(fields.map((f) => [dbName.get(f) ?? f, 1 as const]));
		const indexName = (fields: string[], suffix: 'key' | 'idx') =>
			`${collection}_${fields.map((f) => dbName.get(f) ?? f).join('_')}_${suffix}`;

		const indexes: SchemaIndex[] = [];
		for (const line of lines) {
			const trimmed = line.trim();
			const block = /^@@(unique|index)\(\s*\[([^\]]+)\]/.exec(trimmed);
			if (block) {
				const fields = fieldList(block[2]);
				const unique = block[1] === 'unique';
				indexes.push({
					name: indexName(fields, unique ? 'key' : 'idx'),
					key: toKey(fields),
					...(unique ? { unique: true as const } : {})
				});
				continue;
			}
			const field = FIELD_LINE.exec(line)?.[1];
			if (field && !trimmed.startsWith('@@') && /\s@unique\b/.test(line) && !/@id\b/.test(line)) {
				indexes.push({ name: indexName([field], 'key'), key: toKey([field]), unique: true });
			}
		}
		collections.push({ name: collection, indexes });
	}
	return collections;
}
