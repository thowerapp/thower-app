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

/** Rattachement d'une vidéo à des jours du programme (J1–J91). */
export type AdminVideoDayLink =
	/** `ProgramDayItem` du programme actif : jour précis */
	| { source: 'day'; dayIndex: number }
	/** `DailyTask` VIDEO : plage de jours (bornes null = ouvertes) */
	| { source: 'task'; from: number | null; until: number | null };

/** Fiches de seed : pas de vraie vidéo Cloudflare derrière (cf. deleteVideo / playback-token). */
export function isSeedCloudflareUid(uid: string | null | undefined): boolean {
	return !!uid && (uid.startsWith('cf_seed_') || uid.startsWith('cf_seeded_'));
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
	isSeed: boolean;
	days: AdminVideoDayLink[];

	// Workout-specific
	sessionType?: string | null;
	position?: string | null;
	isOptional?: boolean | null;

	// Discovery-specific
	category?: string | null;
	order?: number | null;
	active?: boolean | null;
};

function pushLink(map: Map<string, AdminVideoDayLink[]>, id: string, link: AdminVideoDayLink) {
	const list = map.get(id);
	if (list) list.push(link);
	else map.set(id, [link]);
}

/** Tous les rattachements vidéo ↔ jour en 2 requêtes (pas de N+1 sur la liste admin). */
async function fetchDayLinks(): Promise<{
	byWorkout: Map<string, AdminVideoDayLink[]>;
	byDiscovery: Map<string, AdminVideoDayLink[]>;
}> {
	const byWorkout = new Map<string, AdminVideoDayLink[]>();
	const byDiscovery = new Map<string, AdminVideoDayLink[]>();

	const [items, tasks] = await Promise.all([
		prisma.programDayItem.findMany({
			where: {
				OR: [{ discoveryContentId: { not: null } }, { workoutVideoId: { not: null } }],
				programDay: { program: { active: true } }
			},
			select: {
				discoveryContentId: true,
				workoutVideoId: true,
				programDay: { select: { dayIndex: true } }
			}
		}),
		prisma.dailyTask.findMany({
			where: { active: true, discoveryContentId: { not: null } },
			select: { discoveryContentId: true, showFromDay: true, showUntilDay: true }
		})
	]);

	for (const it of items) {
		const link: AdminVideoDayLink = { source: 'day', dayIndex: it.programDay.dayIndex };
		if (it.workoutVideoId) pushLink(byWorkout, it.workoutVideoId, link);
		if (it.discoveryContentId) pushLink(byDiscovery, it.discoveryContentId, link);
	}
	for (const t of tasks) {
		if (!t.discoveryContentId) continue;
		pushLink(byDiscovery, t.discoveryContentId, {
			source: 'task',
			from: t.showFromDay ?? null,
			until: t.showUntilDay ?? null
		});
	}

	return { byWorkout, byDiscovery };
}

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

	const { byWorkout, byDiscovery } = await fetchDayLinks();

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
			isSeed: isSeedCloudflareUid(v.cloudflareUid),
			days: byWorkout.get(v.id) ?? [],
			sessionType: v.sessionType ?? null,
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
			isSeed: isSeedCloudflareUid(uid),
			days: byDiscovery.get(id) ?? [],
			category: d.category,
			active: d.active ?? true
		});
	}

	return rows;
}
