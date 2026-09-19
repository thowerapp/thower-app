import { randomInt } from 'node:crypto';
import { prisma } from '$lib/server';

// Alphabet sans caractères ambigus (0/O, 1/I/L) pour une saisie manuelle facile.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const GROUP_LENGTH = 4;
const GROUP_COUNT = 3;

function generateCode(): string {
	const groups = Array.from({ length: GROUP_COUNT }, () =>
		Array.from({ length: GROUP_LENGTH }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('')
	);
	return `THOWER-${groups.join('-')}`;
}

export type CreateRedemptionCodesData = {
	count: number;
	createdByAdminId: string;
	note?: string | null;
};

/** Génère `count` codes à usage unique, en évitant les collisions (peu probables vu l'espace de nommage). */
export async function createRedemptionCodes({
	count,
	createdByAdminId,
	note
}: CreateRedemptionCodesData): Promise<string[]> {
	const codes: string[] = [];

	for (let i = 0; i < count; i++) {
		let code = generateCode();
		// Extrêmement improbable, mais on regénère en cas de collision plutôt que d'échouer.
		while (await prisma.redemptionCode.findUnique({ where: { code } })) {
			code = generateCode();
		}
		await prisma.redemptionCode.create({
			data: { code, createdByAdminId, note: note || null }
		});
		codes.push(code);
	}

	return codes;
}
