import { z } from 'zod';

export const pointRewardSchema = z.object({
	slug: z.string().min(1),
	costPoints: z.number().int().min(0)
});

export type PointRewardSchema = z.infer<typeof pointRewardSchema>;
