import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	VIDEO_COMPLETION_THRESHOLD,
	computeCompletion,
	upsertVideoProgress
} from './upsertProgress';

// ── 1. Tests purs — computeCompletion ────────────────────────────────────────
// Aucune dépendance externe : testent uniquement la logique de seuil.

describe('computeCompletion — seuil position', () => {
	const DURATION = 100; // secondes

	it('ne complète pas à 79 % (en-dessous du seuil)', () => {
		expect(computeCompletion(79, DURATION, false, false)).toBe(false);
	});

	it('complète exactement à 80 % (seuil actuel)', () => {
		const threshold = Math.round(DURATION * VIDEO_COMPLETION_THRESHOLD);
		expect(computeCompletion(threshold, DURATION, false, false)).toBe(true);
	});

	it('complète au-delà de 80 % (ex : 95 %)', () => {
		expect(computeCompletion(95, DURATION, false, false)).toBe(true);
	});

	it('VIDEO_COMPLETION_THRESHOLD vaut bien 0.8', () => {
		expect(VIDEO_COMPLETION_THRESHOLD).toBe(0.8);
	});
});

describe('computeCompletion — événement ended', () => {
	it('complète si ended=true même à position 0', () => {
		expect(computeCompletion(0, 100, true, false)).toBe(true);
	});

	it('complète si ended=true même sans durée connue', () => {
		expect(computeCompletion(0, null, true, false)).toBe(true);
	});
});

describe('computeCompletion — idempotence (déjà complété)', () => {
	it('ne retourne pas true si la vidéo était déjà complétée', () => {
		expect(computeCompletion(95, 100, false, true)).toBe(false);
	});

	it("ne retourne pas true avec ended=true si déjà complété", () => {
		expect(computeCompletion(0, 100, true, true)).toBe(false);
	});
});

describe('computeCompletion — durée inconnue (null)', () => {
	it('ne complète pas si durée inconnue et ended=false', () => {
		expect(computeCompletion(999, null, false, false)).toBe(false);
	});
});

// ── 2. Tests d'intégration — upsertVideoProgress avec Prisma mocké ───────────

vi.mock('$lib/server', () => {
	const makePrisma = () => ({
		workoutVideo: {
			findUnique: vi.fn()
		},
		discoveryContent: {
			findUnique: vi.fn()
		},
		userVideoProgress: {
			findFirst: vi.fn(),
			create: vi.fn(),
			update: vi.fn()
		}
	});
	return { prisma: makePrisma() };
});

async function getPrisma() {
	const { prisma } = await import('$lib/server');
	return prisma as unknown as {
		workoutVideo: { findUnique: ReturnType<typeof vi.fn> };
		discoveryContent: { findUnique: ReturnType<typeof vi.fn> };
		userVideoProgress: {
			findFirst: ReturnType<typeof vi.fn>;
			create: ReturnType<typeof vi.fn>;
			update: ReturnType<typeof vi.fn>;
		};
	};
}

beforeEach(async () => {
	vi.clearAllMocks();
	const db = await getPrisma();
	// Valeurs par défaut réinitialisées avant chaque test
	db.workoutVideo.findUnique.mockResolvedValue({ id: 'vid1', durationSeconds: 100 });
	db.discoveryContent.findUnique.mockResolvedValue({ id: 'dc1', durationSeconds: 100 });
	db.userVideoProgress.findFirst.mockResolvedValue(null);
	db.userVideoProgress.create.mockResolvedValue({});
	db.userVideoProgress.update.mockResolvedValue({});
});

describe('upsertVideoProgress — workout, premier heartbeat', () => {
	it('ne complète pas à 79 % (sous le seuil)', async () => {
		const db = await getPrisma();
		db.workoutVideo.findUnique.mockResolvedValue({ id: 'vid1', durationSeconds: 100 });
		db.userVideoProgress.findFirst.mockResolvedValue(null);

		const result = await upsertVideoProgress({
			kind: 'workout',
			userId: 'u1',
			workoutVideoId: 'vid1',
			positionSec: 79
		});

		expect(result.completedNow).toBe(false);
		expect(result.alreadyCompleted).toBe(false);
		expect(result.maxPositionSec).toBe(79);
	});

	it('complète exactement à 80 % → completedNow: true', async () => {
		const db = await getPrisma();
		db.workoutVideo.findUnique.mockResolvedValue({ id: 'vid1', durationSeconds: 100 });
		db.userVideoProgress.findFirst.mockResolvedValue(null);

		const result = await upsertVideoProgress({
			kind: 'workout',
			userId: 'u1',
			workoutVideoId: 'vid1',
			positionSec: 80
		});

		expect(result.completedNow).toBe(true);
		expect(result.alreadyCompleted).toBe(false);
		// create (pas update) car aucune entrée existante
		expect(db.userVideoProgress.create).toHaveBeenCalledOnce();
	});

	it('complète via ended=true même à position 0', async () => {
		const result = await upsertVideoProgress({
			kind: 'workout',
			userId: 'u1',
			workoutVideoId: 'vid1',
			positionSec: 0,
			ended: true
		});

		expect(result.completedNow).toBe(true);
	});
});

describe('upsertVideoProgress — workout, appel après complétion (idempotence)', () => {
	it('ne re-complète pas si completedAt déjà set', async () => {
		const db = await getPrisma();
		db.userVideoProgress.findFirst.mockResolvedValue({
			id: 'prog1',
			maxPositionSec: 85,
			completedAt: new Date()
		});

		const result = await upsertVideoProgress({
			kind: 'workout',
			userId: 'u1',
			workoutVideoId: 'vid1',
			positionSec: 90
		});

		expect(result.completedNow).toBe(false);
		expect(result.alreadyCompleted).toBe(true);
		// update (entrée existante) mais sans completedAt dans le payload
		expect(db.userVideoProgress.update).toHaveBeenCalledOnce();
	});
});

describe('upsertVideoProgress — discovery', () => {
	it('complète à 80 % → completedNow: true', async () => {
		const db = await getPrisma();
		db.discoveryContent.findUnique.mockResolvedValue({ id: 'dc1', durationSeconds: 200 });
		db.userVideoProgress.findFirst.mockResolvedValue(null);

		const result = await upsertVideoProgress({
			kind: 'discovery',
			userId: 'u1',
			discoveryContentId: 'dc1',
			positionSec: 160 // 80 % de 200
		});

		expect(result.completedNow).toBe(true);
		expect(result.durationSeconds).toBe(200);
	});

	it('ne complète pas à 79 % sur discovery', async () => {
		const db = await getPrisma();
		db.discoveryContent.findUnique.mockResolvedValue({ id: 'dc1', durationSeconds: 200 });
		db.userVideoProgress.findFirst.mockResolvedValue(null);

		const result = await upsertVideoProgress({
			kind: 'discovery',
			userId: 'u1',
			discoveryContentId: 'dc1',
			positionSec: 158 // 79 % de 200
		});

		expect(result.completedNow).toBe(false);
	});
});

describe('upsertVideoProgress — progression max croissante', () => {
	it('retient le max entre la progression précédente et la nouvelle', async () => {
		const db = await getPrisma();
		db.userVideoProgress.findFirst.mockResolvedValue({
			id: 'prog1',
			maxPositionSec: 70,
			completedAt: null
		});

		const result = await upsertVideoProgress({
			kind: 'workout',
			userId: 'u1',
			workoutVideoId: 'vid1',
			positionSec: 50 // régression (seek back) → doit garder 70
		});

		expect(result.maxPositionSec).toBe(70);
		expect(result.completedNow).toBe(false);
	});
});
