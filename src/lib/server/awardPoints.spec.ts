import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = { pointEvent: { create: vi.fn((args: unknown) => args) } };
vi.mock('$lib/server', () => ({ prisma: prismaMock }));

const { awardPoints, pointAmount } = await import('./awardPoints');
const { POINTS } = await import('./pointsConfig');

beforeEach(() => vi.clearAllMocks());

describe('awardPoints', () => {
	it('prend le montant de POINTS pour un type à montant fixe', () => {
		expect(pointAmount({ userId: 'u1', type: 'PHOTO_UPLOAD' })).toBe(POINTS.PHOTO_UPLOAD);
		expect(pointAmount({ userId: 'u1', type: 'VIDEO_WATCHED', amount: 7 })).toBe(7);
	});

	it('exige un montant explicite pour les autres types', () => {
		expect(pointAmount({ userId: 'u1', type: 'DAILY_TASK', amount: 25 })).toBe(25);
	});

	it('crée le PointEvent via le client par défaut', () => {
		awardPoints({ userId: 'u1', type: 'MONTHLY_CHECKIN', metadata: { month: 2 } });
		expect(prismaMock.pointEvent.create).toHaveBeenCalledWith({
			data: { userId: 'u1', type: 'MONTHLY_CHECKIN', amount: POINTS.MONTHLY_CHECKIN, metadata: { month: 2 } }
		});
	});

	it('utilise le client de transaction fourni', () => {
		const tx = { pointEvent: { create: vi.fn() } };
		awardPoints({ userId: 'u1', type: 'WORKOUT_COMPLETE' }, tx as never);
		expect(tx.pointEvent.create).toHaveBeenCalledTimes(1);
		expect(prismaMock.pointEvent.create).not.toHaveBeenCalled();
	});
});
