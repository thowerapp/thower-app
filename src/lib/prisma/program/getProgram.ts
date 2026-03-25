import { prisma } from '$lib/server';

export async function getProgram(programId?: string) {
	const client = prisma as { program?: { findFirst: (args: { where?: { id: string }; include?: unknown }) => Promise<unknown> } };
	if (!client?.program) return null;
	const where = programId ? { id: programId } : { active: true };
	const program = await client.program.findFirst({
		where,
		include: { days: true }
	});
	return program;
}
