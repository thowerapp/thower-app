/**
 * Aplatit des listes de chaînes souvent corrompues (double JSON.stringify,
 * tableau contenant une seule chaîne `"[\"a\",\"b\"]"`, etc.).
 */
export function normalizeStringList(val: unknown): string[] {
	const out: string[] = [];

	const pushFlat = (item: unknown): void => {
		if (item == null) return;
		if (typeof item === 'string') {
			const t = item.trim();
			if (!t) return;
			if (t.startsWith('[')) {
				try {
					const parsed = JSON.parse(t) as unknown;
					flatten(parsed);
					return;
				} catch {
					/* chaîne normale qui commence par [ */
				}
			}
			out.push(t);
			return;
		}
		if (Array.isArray(item)) {
			flatten(item);
		}
	};

	function flatten(list: unknown): void {
		if (!Array.isArray(list)) return;
		for (const el of list) pushFlat(el);
	}

	if (Array.isArray(val)) {
		flatten(val);
	} else if (typeof val === 'string') {
		const t = val.trim();
		if (!t) return [];
		if (t.startsWith('[')) {
			try {
				flatten(JSON.parse(t) as unknown);
			} catch {
				out.push(t);
			}
		} else {
			out.push(t);
		}
	}

	return [...new Set(out)];
}
