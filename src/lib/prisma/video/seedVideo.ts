/**
 * Fiches vidéo de seed (seed.js / repairVideoCloudflareBsonFields) : pas de vraie vidéo
 * Cloudflare derrière. Visibles dans l'admin pour être remplacées, jamais côté utilisateur.
 */
export const SEED_UID_PREFIXES = ['cf_seed_', 'cf_seeded_'] as const;

export function isSeedCloudflareUid(uid: string | null | undefined): boolean {
	return !!uid && SEED_UID_PREFIXES.some((p) => uid.startsWith(p));
}

/** Filtre Prisma `where` excluant les fiches de seed (WorkoutVideo / DiscoveryContent). */
export const notSeedVideo = {
	NOT: SEED_UID_PREFIXES.map((p) => ({ cloudflareUid: { startsWith: p } }))
};
