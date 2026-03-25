import { z } from 'zod';

export const dailyTaskSchema = z.object({
	label: z.string().min(1).max(500),
	points: z.number().int().min(0).default(0),
	order: z.number().int().min(0).default(0)
});

export type DailyTaskSchema = z.infer<typeof dailyTaskSchema>;
