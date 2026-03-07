import { prisma } from '$lib/server';

type CreateContactData = {
	name: string;
	email: string;
	subject?: string | null;
	message: string;
};

export async function createContact(data: CreateContactData) {
	if (!prisma?.contact) {
		throw new Error(
			'Prisma client has no "contact" model. Run: npx prisma generate (then restart the dev server).'
		);
	}
	return prisma.contact.create({
		data: {
			name: data.name,
			email: data.email,
			subject: data.subject && data.subject.trim() !== '' ? data.subject.trim() : undefined,
			message: data.message
		}
	});
}
