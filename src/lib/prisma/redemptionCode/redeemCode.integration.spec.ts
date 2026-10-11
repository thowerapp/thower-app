import { describe, expect, it } from 'vitest';
import { prisma } from '$lib/server';
import { createPaidUser } from '$lib/server/testing/integration/db';
import { redeemCode } from './redeemCode';

describe('redeemCode (base réelle)', () => {
	it('deux personnes envoient le même code en même temps : une seule l’obtient', async () => {
		for (let round = 0; round < 10; round++) {
			const code = `CODE${round}`;
			await prisma.redemptionCode.create({ data: { code } });
			const [a, b] = await Promise.all([createPaidUser(), createPaidUser()]);

			const results = await Promise.allSettled([redeemCode(code, a.id), redeemCode(code, b.id)]);

			const winners = results.filter((r) => r.status === 'fulfilled' && r.value.success);
			expect(winners).toHaveLength(1);
			const used = await prisma.redemptionCode.findUnique({ where: { code } });
			const winnerId = results[0].status === 'fulfilled' && results[0].value.success ? a.id : b.id;
			expect(used?.usedByUserId).toBe(winnerId);
			expect(await prisma.transaction.count({ where: { stripePaymentId: `redeem_${code}` } })).toBe(1);
		}
	});

	it('un code déjà utilisé est refusé', async () => {
		const user = await createPaidUser();
		await prisma.redemptionCode.create({ data: { code: 'USED' } });
		expect(await redeemCode('used', user.id)).toEqual({ success: true });
		expect(await redeemCode('USED', user.id)).toEqual({ success: false, reason: 'invalid_or_used' });
	});
});
