import { prisma } from '$lib/server';

export async function getProgram(programId?: string) {
	const where = programId ? { id: programId } : { active: true };
	return prisma.program.findFirst({ where, include: { days: true } });
}
