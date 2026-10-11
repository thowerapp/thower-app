import { createTtlCache } from '$lib/server/cache/ttlCache';

const cache = createTtlCache(60_000);

/** Plan sport global (identique pour tous les users), mis en cache par instance. */
export const cachedSportPlan = cache.get;

/** À appeler après toute écriture qui modifie le plan sport (vidéos, rattachements, séances). */
export const invalidateSportPlan = cache.invalidate;
