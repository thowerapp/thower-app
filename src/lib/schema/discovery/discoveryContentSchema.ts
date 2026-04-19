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
	title: z.string().min(1, 'Titre requis.').max(300),
	cloudflareUid: z.string().min(1, 'UID Cloudflare requis.').max(64),
	order: z.number().int().min(0).default(0),
	unlockThreshold: z.number().int().min(0).default(0),
	breathworkIntent: z.string().max(100).optional().nullable(),
	tags: z.array(z.string()).default([])
});

export type DiscoveryContentSchema = z.infer<typeof discoveryContentSchema>;
