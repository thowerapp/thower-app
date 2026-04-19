import { z } from 'zod';

export const workoutVideoPositionEnum = z.enum(['PRE', 'VID1', 'VID2']);

export const workoutVideoSchema = z.object({
	cloudflareUid: z.string().min(1, 'UID Cloudflare requis.').max(64),
	title: z.string().min(1, 'Titre requis.').max(200),
	position: workoutVideoPositionEnum,
	isOptional: z.boolean().default(false),
	order: z.number().int().min(0).default(0)
});

export type WorkoutVideoSchema = z.infer<typeof workoutVideoSchema>;
