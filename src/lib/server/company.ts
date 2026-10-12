import { prisma } from '$lib/server';
import { createTtlCache } from '$lib/server/cache/ttlCache';
import {
	COMPANY_TEXT_FIELDS,
	DEFAULT_COMPANY,
	type CompanyProfileData
} from '$lib/company/companyProfile';

const KEY = 'main';
const cache = createTtlCache(60_000);

function toData(row: Record<string, unknown> | null): CompanyProfileData {
	if (!row) return { ...DEFAULT_COMPANY };
	const data: CompanyProfileData = {
		...DEFAULT_COMPANY,
		brandName: typeof row.brandName === 'string' ? row.brandName : DEFAULT_COMPANY.brandName
	};
	for (const field of COMPANY_TEXT_FIELDS)
		data[field] = typeof row[field] === 'string' ? (row[field] as string) : null;
	return data;
}

/** Fiche entreprise ; celle par défaut tant qu'aucune n'est enregistrée ou si la base ne répond pas (le site doit rester servi). */
export async function getCompanyProfile(): Promise<CompanyProfileData> {
	try {
		return await cache.get(async () =>
			toData(await prisma.companyProfile.findUnique({ where: { key: KEY } }))
		);
	} catch (err) {
		console.error('[company] lecture de la fiche entreprise impossible', err);
		return { ...DEFAULT_COMPANY };
	}
}

export async function saveCompanyProfile(data: CompanyProfileData, adminId: string): Promise<void> {
	await prisma.companyProfile.upsert({
		where: { key: KEY },
		create: { key: KEY, ...data, updatedById: adminId },
		update: { ...data, updatedById: adminId }
	});
	cache.invalidate();
}
