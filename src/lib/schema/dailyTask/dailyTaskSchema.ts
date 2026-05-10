import { z } from 'zod';

export const dailyTaskSchema = z
	.object({
		id: z.string().optional(),
		label: z.string().min(1, 'Le libellé est requis.'),
		points: z.coerce.number().int().min(0).default(0),
		order: z.coerce.number().int().min(0).default(0),
		type: z.enum(['STANDARD', 'VIDEO']).default('STANDARD'),
		discoveryContentId: z.string().optional().nullable(),
		active: z.boolean().default(true),
		showFromDay: z.coerce.number().int().min(1).optional().nullable(),
		showUntilDay: z.coerce.number().int().min(1).optional().nullable()
	})
	.refine(
		(d) =>
			d.showFromDay == null || d.showUntilDay == null || d.showFromDay <= d.showUntilDay,
		{ message: 'Le jour de début doit être ≤ au jour de fin.', path: ['showUntilDay'] }
	);

export const toggleActiveSchema = z.object({
	id: z.string().min(1, 'ID requis.')
});

export const deleteTaskSchema = z.object({
	id: z.string().min(1, 'ID requis.')
});

export type DeleteTaskSchema = z.infer<typeof deleteTaskSchema>;

export type DailyTaskSchema = z.infer<typeof dailyTaskSchema>;
export type ToggleActiveSchema = z.infer<typeof toggleActiveSchema>;
