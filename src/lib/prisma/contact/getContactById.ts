import { prisma } from '$lib/server';

export async function getContactById(id: string) {
	if (!prisma?.contact) {
		throw new Error(
			'Prisma client has no "contact" model. Run: npx prisma generate (then restart the dev server).'
		);
	}
	return prisma.contact.findUnique({
		where: { id }
	});
}
