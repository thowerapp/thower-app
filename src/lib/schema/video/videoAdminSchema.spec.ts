import { describe, expect, it } from 'vitest';
import { createVideoSchema } from './videoAdminSchema';

const discovery = {
	kind: 'discovery' as const,
	cloudflareUid: 'abc123',
	title: 'Bienvenue',
	category: 'MOTIVATION' as const
};

describe('createVideoSchema — checklist', () => {
	it('accepte une vidéo Découverte ajoutée à la checklist', () => {
		const r = createVideoSchema.safeParse({
			...discovery,
			addToChecklist: true,
			checklist: { fromDay: 3, untilDay: 3, points: 20 }
		});
		expect(r.success).toBe(true);
	});

	it('exige les jours quand la checklist est cochée', () => {
		const r = createVideoSchema.safeParse({ ...discovery, addToChecklist: true });
		expect(r.success).toBe(false);
	});

	it('refuse un jour de début après le jour de fin', () => {
		const r = createVideoSchema.safeParse({
			...discovery,
			addToChecklist: true,
			checklist: { fromDay: 10, untilDay: 3, points: 20 }
		});
		expect(r.success).toBe(false);
	});

	it('refuse une vidéo sport dans la checklist', () => {
		const r = createVideoSchema.safeParse({
			kind: 'workout',
			cloudflareUid: 'abc123',
			title: 'Vidéo 1',
			sessionType: 'MAIN_A',
			position: 'VID1',
			addToChecklist: true,
			checklist: { fromDay: 1, untilDay: 1, points: 20 }
		});
		expect(r.success).toBe(false);
	});

	it('laisse inchangée une vidéo Découverte classique', () => {
		expect(createVideoSchema.safeParse(discovery).success).toBe(true);
	});
});
