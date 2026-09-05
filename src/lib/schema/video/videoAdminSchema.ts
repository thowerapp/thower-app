import { z } from 'zod';
import { workoutVideoPositionEnum } from '$lib/schema/workout/workoutVideoSchema';
import { workoutSessionTypeEnum } from '$lib/schema/workout/workoutSessionSchema';
import { discoveryCategoryEnum } from '$lib/schema/discovery/discoveryContentSchema';
import { attachDaySchema } from '$lib/schema/video/attachDaySchema';

/** Type discriminé : une vidéo gérée dans /admin/videos est soit "workout" soit "discovery". */
export const videoKindEnum = z.enum(['workout', 'discovery']);
export type VideoKind = z.infer<typeof videoKindEnum>;

const baseVideoFields = {
	cloudflareUid: z.string().min(1, 'UID Cloudflare requis.').max(64),
	title: z.string().min(1, 'Titre requis.').max(300)
};

/** Champs bruts communs création / édition, sans validation métier (superRefine ajouté après). */
const videoFormCoreBaseSchema = z.object({
	kind: videoKindEnum,
	...baseVideoFields,

		// Workout-only
		sessionType: workoutSessionTypeEnum.optional().nullable(),
		position: workoutVideoPositionEnum.optional().nullable(),
		isOptional: z.boolean().default(false),

		// Discovery-only
		category: discoveryCategoryEnum.optional().nullable(),
		order: z.number().int().min(0).default(0)
});

/**
 * Champs métier communs — version édition (toutes les validations, dont séance requise).
 * Le rattachement programme optionnel est ajouté dans update/create schemas.
 */
export const videoFormCoreSchema = videoFormCoreBaseSchema.superRefine((d, ctx) => {
	if (d.kind === 'workout' && !d.position) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'Position requise (PRE, VID1 ou VID2).',
			path: ['position']
		});
	}
	if (d.kind === 'workout' && !d.sessionType) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'Séance requise (MAIN_A, MAIN_B, MAIN_C ou DISCOVERY).',
			path: ['sessionType']
		});
	}
	if (d.kind === 'discovery' && !d.category) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'Catégorie requise pour une vidéo Découverte.',
			path: ['category']
		});
	}
});


export type VideoFormCoreInput = z.infer<typeof videoFormCoreSchema>;

const optionalProgramDayAttachFields = z.object({
	attachToProgramDay: z.boolean().default(false),
	programDayAttach: attachDaySchema.optional()
});

const refineProgramDayAttachIfEnabled = (
	d: VideoFormCoreInput & z.infer<typeof optionalProgramDayAttachFields>,
	ctx: z.RefinementCtx
) => {
	if (!d.attachToProgramDay) return;
	if (!d.programDayAttach) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'Complète jour, type et points pour rattacher cette vidéo au programme.',
			path: ['programDayAttach']
		});
	}
};

/**
 * Création : position + catégorie requises, rattachement programme optionnel.
 */
export const createVideoSchema = videoFormCoreSchema
	.and(optionalProgramDayAttachFields)
	.superRefine(refineProgramDayAttachIfEnabled);

export type CreateVideoSchema = z.infer<typeof createVideoSchema>;

/** Édition : mêmes champs + rattachement optionnel (comme à la création). */
export const updateVideoSchema = videoFormCoreSchema
	.and(optionalProgramDayAttachFields)
	.superRefine(refineProgramDayAttachIfEnabled);

export type UpdateVideoSchema = z.infer<typeof updateVideoSchema>;

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
