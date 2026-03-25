import { z } from 'zod';

export const pointEventTypeEnum = z.enum([
	'WORKOUT_COMPLETE',
	'VIDEO_WATCHED',
	'DAILY_TASK',
	'BADGE_UNLOCK',
	'CHALLENGE_COMPLETE',
	'PHOTO_UPLOAD',
	'POINT_SPENT'
]);

export const pointEventSchema = z.object({
	type: pointEventTypeEnum,
	amount: z.number().int(),
	metadata: z.record(z.unknown()).optional().nullable()
});

export type PointEventSchema = z.infer<typeof pointEventSchema>;
