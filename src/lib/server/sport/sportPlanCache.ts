const TTL_MS = 60_000;

type Entry = { loadedAt: number; value: Promise<unknown> };

let entry: Entry | null = null;

/**
 * Plan sport global (identique pour tous les users) mis en cache par instance.
 * Les autres instances serverless rattrapent un changement admin au plus tard après `TTL_MS`.
 */
export function cachedSportPlan<T>(load: () => Promise<T>): Promise<T> {
	const now = Date.now();
	if (entry && now - entry.loadedAt < TTL_MS) return entry.value as Promise<T>;

	const value = load();
	const created: Entry = { loadedAt: now, value };
	entry = created;
	// Un chargement en erreur ne doit pas rester en cache.
	value.catch(() => {
		if (entry === created) entry = null;
	});
	return value;
}

/** À appeler après toute écriture qui modifie le plan sport (vidéos, rattachements, séances). */
export function invalidateSportPlan(): void {
	entry = null;
}
