import { z } from 'zod';
import { workoutVideoPositionEnum } from '$lib/schema/workout/workoutVideoSchema';
import { discoveryCategoryEnum } from '$lib/schema/discovery/discoveryContentSchema';

/** Type discriminé : une vidéo gérée dans /admin/videos est soit "workout" soit "discovery". */
export const videoKindEnum = z.enum(['workout', 'discovery']);
export type VideoKind = z.infer<typeof videoKindEnum>;

const baseVideoFields = {
	cloudflareUid: z.string().min(1, 'UID Cloudflare requis.').max(64),
	title: z.string().min(1, 'Titre requis.').max(300),
	order: z.number().int().min(0).default(0)
};

/**
 * Création d'une vidéo (sport ou découverte) — formulaire admin unifié.
 * Le champ `kind` discrimine ; les autres champs sont validés conditionnellement.
 */
export const createVideoSchema = z
	.object({
		kind: videoKindEnum,
		...baseVideoFields,

		// Workout-only
		sessionId: z.string().optional().nullable(),
		position: workoutVideoPositionEnum.optional().nullable(),
		isOptional: z.boolean().default(false),

		// Discovery-only
		category: discoveryCategoryEnum.optional().nullable(),
		unlockThreshold: z.number().int().min(0).default(0),
		breathworkIntent: z.string().max(100).optional().nullable(),
		tags: z.array(z.string()).default([])
	})
	.superRefine((d, ctx) => {
		if (d.kind === 'workout') {
			if (!d.sessionId) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Séance requise pour une vidéo sport.',
					path: ['sessionId']
				});
			}
			if (!d.position) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Position requise (PRE, VID1 ou VID2).',
					path: ['position']
				});
			}
		}
		if (d.kind === 'discovery' && !d.category) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Catégorie requise pour une vidéo Découverte.',
				path: ['category']
			});
		}
	});

export type CreateVideoSchema = z.infer<typeof createVideoSchema>;

/** Édition (id implicite via paramètre de route) — mêmes contraintes que create. */
export const updateVideoSchema = createVideoSchema;
export type UpdateVideoSchema = CreateVideoSchema;

/**
 * Suppression : `id` est composite `kind:realId` (ex. "workout:65a…")
 * pour rester compatible avec le composant Table partagé qui ne passe
 * qu'un champ caché `id` au form delete.
 */
export const deleteVideoSchema = z.object({
	id: z.string().regex(/^(workout|discovery):[a-f0-9]{24}$/i, 'ID composite invalide.')
});
export type DeleteVideoSchema = z.infer<typeof deleteVideoSchema>;

export function parseCompositeVideoId(composite: string): { kind: VideoKind; id: string } {
	const [kindRaw, id] = composite.split(':');
	const kind = videoKindEnum.parse(kindRaw);
	return { kind, id };
}
