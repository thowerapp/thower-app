import { z } from 'zod';

export const verifyCodeSchema = z.object({
	code: z.string().length(8, 'Le code doit contenir 8 caractères.')
});

export type verifyCodeForm = z.infer<typeof verifyCodeSchema>;
