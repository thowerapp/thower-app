import { z } from 'zod';

export const workoutVideoPositionEnum = z.enum(['PRE', 'VID1', 'VID2']);

export const workoutVideoSchema = z.object({
	youtubeId: z.string().min(1).max(20),
	title: z.string().min(1).max(200),
	position: workoutVideoPositionEnum,
	isOptional: z.boolean().default(false),
	order: z.number().int().min(0).default(0)
});

export type WorkoutVideoSchema = z.infer<typeof workoutVideoSchema>;
