import { z } from 'zod';

export const discoveryCategoryEnum = z.enum([
	'MEDITATION',
	'MINDSET',
	'BREATHWORK',
	'MOTIVATION',
	'EXPLICATION'
]);

export const discoveryContentSchema = z.object({
	category: discoveryCategoryEnum,
	title: z.string().min(1).max(300),
	youtubeId: z.string().min(1).max(20),
	order: z.number().int().min(0).default(0),
	unlockThreshold: z.number().int().min(0).default(0),
	breathworkIntent: z.string().max(100).optional().nullable(),
	tags: z.array(z.string()).default([])
});

export type DiscoveryContentSchema = z.infer<typeof discoveryContentSchema>;
