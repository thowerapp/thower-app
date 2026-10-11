/**
 * Cache mémoire d'une valeur unique, par instance serveur, avec expiration.
 * Les autres instances serverless rattrapent un changement au plus tard après `ttlMs`.
 */
export function createTtlCache(ttlMs: number) {
	let entry: { loadedAt: number; value: Promise<unknown> } | null = null;

	return {
		get<T>(load: () => Promise<T>): Promise<T> {
			const now = Date.now();
			if (entry && now - entry.loadedAt < ttlMs) return entry.value as Promise<T>;

			const value = load();
			const created = { loadedAt: now, value };
			entry = created;
			// Un chargement en erreur ne doit pas rester en cache.
			value.catch(() => {
				if (entry === created) entry = null;
			});
			return value;
		},
		invalidate(): void {
			entry = null;
		}
	};
}
