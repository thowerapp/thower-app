import { prisma } from '$lib/server';
import { repairVideoCloudflareBsonFields } from '$lib/server/mongo/repairVideoCloudflareBsonFields';

/** BSON / EJSON → chaîne ObjectId hex (évite de passer par Prisma sur des docs legacy `youtubeId`). */
function bsonIdToString(id: unknown): string {
	if (id == null) return '';
	if (typeof id === 'string') return id;
	if (typeof id === 'object' && id !== null && '$oid' in id) {
		return String((id as { $oid: string }).$oid);
	}
	const hex = (id as { toHexString?: () => string }).toHexString;
	if (typeof hex === 'function') return hex.call(id);
	return String(id);
}

function bsonDateToDate(v: unknown): Date | null {
	if (v == null) return null;
	if (v instanceof Date) return v;
	if (typeof v === 'object' && v !== null && '$date' in v) {
		const d = (v as { $date: string | number }).$date;
		return new Date(typeof d === 'number' ? d : d);
	}
	return null;
}

type RawDiscoveryDoc = {
	_id: unknown;
	category: string;
	title: string;
	cloudflareUid?: string | null;
	order?: number;
	unlockThreshold?: number;
	breathworkIntent?: string | null;
	tags?: string[];
	active?: boolean;
	durationSeconds?: number | null;
	status?: string | null;
	thumbnailUrl?: string | null;
	createdAt?: unknown;
	updatedAt?: unknown;
};

/**
 * Lecture directe Mongo (`find` + projection) : n'envoie pas les clés hors schéma
 * (ex. `youtubeId` résiduelle) au moteur Prisma, ce qui évite l'erreur de conversion.
 */
async function fetchDiscoveryContentsMongoRaw(): Promise<RawDiscoveryDoc[]> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const db = prisma as any;
	const res = (await db.$runCommandRaw({
		find: 'discovery_contents',
		filter: {},
		projection: {
			_id: 1,
			category: 1,
			title: 1,
			cloudflareUid: 1,
			order: 1,
			unlockThreshold: 1,
			breathworkIntent: 1,
			tags: 1,
			active: 1,
			durationSeconds: 1,
			status: 1,
			thumbnailUrl: 1,
			createdAt: 1,
			updatedAt: 1
		},
		limit: 10_000
	})) as { ok?: number; cursor?: { firstBatch?: RawDiscoveryDoc[] } };
	if (res.ok !== 1 && res.ok !== undefined) {
		console.warn('[getAllAdminVideos] discovery_contents find raw — ok != 1', res);
	}
	return res.cursor?.firstBatch ?? [];
}

export type AdminVideoRow = {
	id: string;
	kind: 'workout' | 'discovery';
	title: string;
	cloudflareUid: string;
	durationSeconds: number | null;
	status: string;
	thumbnailUrl: string | null;
	createdAt: Date | null;
	updatedAt: Date;

	// Workout-specific
	position?: string | null;
	isOptional?: boolean | null;

	// Discovery-specific
	category?: string | null;
	order?: number | null;
	unlockThreshold?: number | null;
	breathworkIntent?: string | null;
	tags?: string[] | null;
	active?: boolean | null;
};

/** Liste unifiée pour l'écran admin /admin/videos (séances + découverte). */
export async function getAllAdminVideos(): Promise<AdminVideoRow[]> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const db = prisma as any;

	// Données Mongo héritées — réparation best-effort (peut échouer selon la version Mongo / format commande)
	await repairVideoCloudflareBsonFields();

	const workoutVideos = db.workoutVideo
		? await db.workoutVideo.findMany({ orderBy: [{ position: 'asc' }, { title: 'asc' }] })
		: [];

	const rawDiscovery = await fetchDiscoveryContentsMongoRaw();
	rawDiscovery.sort((a, b) => {
		const c = String(a.category ?? '').localeCompare(String(b.category ?? ''));
		if (c !== 0) return c;
		return (a.order ?? 0) - (b.order ?? 0);
	});

	const rows: AdminVideoRow[] = [];

	for (const v of workoutVideos) {
		rows.push({
			id: v.id,
			kind: 'workout',
			title: v.title,
			cloudflareUid: v.cloudflareUid,
			durationSeconds: v.durationSeconds ?? null,
			status: v.status ?? 'pending',
			thumbnailUrl: v.thumbnailUrl ?? null,
			createdAt: null,
			updatedAt: v.updatedAt,
			position: v.position,
			isOptional: v.isOptional ?? false
		});
	}

	for (const d of rawDiscovery) {
		const id = bsonIdToString(d._id);
		const uid =
			d.cloudflareUid != null && String(d.cloudflareUid).trim() !== ''
				? String(d.cloudflareUid).trim()
				: `cf_seeded_${id}`;
		rows.push({
			id,
			kind: 'discovery',
			title: d.title,
			cloudflareUid: uid,
			durationSeconds: d.durationSeconds ?? null,
			status: d.status ?? 'pending',
			thumbnailUrl: d.thumbnailUrl ?? null,
			order: d.order ?? 0,
			createdAt: bsonDateToDate(d.createdAt),
			updatedAt: bsonDateToDate(d.updatedAt) ?? new Date(),
			category: d.category,
			unlockThreshold: d.unlockThreshold ?? 0,
			breathworkIntent: d.breathworkIntent ?? null,
			tags: Array.isArray(d.tags) ? d.tags : [],
			active: d.active ?? true
		});
	}

	return rows;
}
