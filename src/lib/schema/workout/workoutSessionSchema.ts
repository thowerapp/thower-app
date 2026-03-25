import { z } from 'zod';

export const workoutSessionTypeEnum = z.enum(['MAIN_A', 'MAIN_B', 'MAIN_C', 'DISCOVERY']);

export const workoutSessionSchema = z.object({
	type: workoutSessionTypeEnum,
	name: z.string().min(1).max(200),
	description: z.string().max(2000).optional().nullable(),
	weekNumber: z.number().int().min(1).max(13).optional().nullable(),
	order: z.number().int().min(0).default(0)
});

export type WorkoutSessionSchema = z.infer<typeof workoutSessionSchema>;
