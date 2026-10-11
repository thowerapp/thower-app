import { describe, expect, it } from 'vitest';
import { prisma } from '$lib/server';
import { countQueries, createPaidUser } from '$lib/server/testing/integration/db';
import { claimProgramGeneration, GENERATION_LEASE_MS, shouldResumeProgramGeneration } from './generationLock';

describe('verrou de génération (base réelle)', () => {
	it('réservations simultanées (20 rondes de 5) : une seule obtient le verrou à chaque fois', async () => {
		for (let round = 0; round < 20; round++) {
			const user = await createPaidUser();
			const claims = await Promise.all(Array.from({ length: 5 }, () => claimProgramGeneration(user.id)));
			expect(claims.filter(Boolean)).toHaveLength(1);
		}
	});

	it('un compte antérieur au suivi (champ absent) peut être réservé', async () => {
		const user = await createPaidUser();
		await prisma.$runCommandRaw({
			update: 'User',
			updates: [{ q: { _id: { $oid: user.id } }, u: { $unset: { programGenStatus: '' } } }]
		});
		expect(await claimProgramGeneration(user.id)).toBe(true);
	});

	it('bail expiré : reprise possible ; bail en cours : refus', async () => {
		const user = await createPaidUser();
		const now = new Date();
		await prisma.user.update({
			where: { id: user.id },
			data: { programGenStatus: 'RUNNING', programGenStartedAt: new Date(now.getTime() - 60_000) }
		});
		expect(await claimProgramGeneration(user.id, now)).toBe(false);
		expect(await shouldResumeProgramGeneration(user.id, now)).toBe(false);

		const later = new Date(now.getTime() + GENERATION_LEASE_MS);
		expect(await shouldResumeProgramGeneration(user.id, later)).toBe(true);
		expect(await claimProgramGeneration(user.id, later)).toBe(true);
	});

	it('la réservation tient en deux requêtes (aggregate + update de Prisma sur MongoDB)', async () => {
		const user = await createPaidUser();
		const { result, queries } = await countQueries(() => claimProgramGeneration(user.id));
		expect(result).toBe(true);
		// Prisma traduit updateMany en recherche des ids puis mise à jour ; l'atomicité sous
		// concurrence est vérifiée par le test des réservations simultanées ci-dessus.
		expect(queries).toHaveLength(2);
	});
});
