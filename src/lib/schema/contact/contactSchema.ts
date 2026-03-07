import { z } from 'zod';

export const contactSchema = z.object({
	name: z
		.string()
		.min(2, 'Le nom doit contenir au moins 2 caractères.')
		.max(100, 'Le nom ne doit pas dépasser 100 caractères.'),
	email: z.string().email('Veuillez entrer une adresse email valide.'),
	subject: z
		.string()
		.max(200, 'Le sujet ne doit pas dépasser 200 caractères.')
		.optional(),
	message: z
		.string()
		.min(10, 'Le message doit contenir au moins 10 caractères.')
		.max(2000, 'Le message ne doit pas dépasser 2000 caractères.')
});

export const deleteContactSchema = z.object({
	id: z.string()
});

export type ContactForm = z.infer<typeof contactSchema>;
export type DeleteContactForm = z.infer<typeof deleteContactSchema>;
