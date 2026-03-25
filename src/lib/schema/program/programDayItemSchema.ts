import { z } from 'zod';

export const programDayItemTypeEnum = z.enum([
	'DAILY_TASK',
	'VIDEO_OF_DAY',
	'BREATHWORK',
	'SPORT_SESSION',
	'STEPS',
	'MINDSET_VIDEO',
	'CUSTOM'
]);

export const programDayItemSchema = z.object({
	type: programDayItemTypeEnum,
	order: z.number().int().min(0).default(0),
	points: z.number().int().min(0).default(0),
	label: z.string().max(500).optional().nullable(),
	stepsThreshold: z.number().int().min(0).optional().nullable(),
	dailyTaskId: z.string().optional().nullable(),
	discoveryContentId: z.string().optional().nullable(),
	workoutSessionId: z.string().optional().nullable()
});

export type ProgramDayItemSchema = z.infer<typeof programDayItemSchema>;
