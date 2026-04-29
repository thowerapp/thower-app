import { z } from 'zod';

const optionalInt1to10 = z.preprocess(
	(val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
	z.number().int().min(1).max(10)
);

/** Formulaire bien-être mensuel — curseurs 1-10 + addictions */
export const wellBeingSchema = z.object({
	stressLevel: optionalInt1to10,
	sleepQuality: optionalInt1to10,
	bodyConfidence: optionalInt1to10,
	digestionQuality: optionalInt1to10,
	happinessLevel: optionalInt1to10,
	readinessToChange: optionalInt1to10,
	addictionsText: z.string().max(2000).optional()
});

export type WellBeingSchema = z.infer<typeof wellBeingSchema>;
