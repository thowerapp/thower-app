import { z } from 'zod';

/** Types ProgramDayItem proposés depuis l'admin vidéo (sous-ensemble pertinent). */
export const attachDayTypeEnum = z.enum([
	'VIDEO_OF_DAY',
	'BREATHWORK',
	'SPORT_SESSION',
	'MINDSET_VIDEO',
	'CUSTOM'
]);
export type AttachDayType = z.infer<typeof attachDayTypeEnum>;

/** Form de rattachement d'une vidéo à un jour 1..91 du programme actif. */
export const attachDaySchema = z.object({
	dayIndex: z.coerce.number().int().min(1).max(91),
	type: attachDayTypeEnum,
	points: z.coerce.number().int().min(0).max(1000),
	label: z.string().max(120).optional().nullable()
});
export type AttachDaySchema = z.infer<typeof attachDaySchema>;

/** Form de détachement (suppression d'un ProgramDayItem). */
export const detachDaySchema = z.object({
	programDayItemId: z.string().min(1)
});
export type DetachDaySchema = z.infer<typeof detachDaySchema>;
