import { describe, expect, it } from 'vitest';
import {
	companyAddressLines,
	companyFormSchema,
	companyIdentityLines,
	companyLegalName,
	copyrightLine,
	DEFAULT_COMPANY,
	formatSiret,
	hasPublisherIdentity
} from './companyProfile';

const parse = (input: Record<string, string>) =>
	companyFormSchema.safeParse({ brandName: 'Thower', ...input });

describe('companyFormSchema', () => {
	it('exige le nom affiché et transforme les champs vides en null', () => {
		expect(companyFormSchema.safeParse({ brandName: '  ' }).success).toBe(false);
		const result = parse({ legalName: '', city: '  Paris  ' });
		expect(result.success && result.data).toMatchObject({
			brandName: 'Thower',
			legalName: null,
			city: 'Paris',
			siret: null
		});
	});

	it('normalise le SIRET, la TVA et le code APE saisis avec des espaces', () => {
		const result = parse({
			siret: '123 456 789 00012',
			vatNumber: 'fr 12 345678901',
			apeCode: '9313 z'
		});
		expect(result.success && result.data).toMatchObject({
			siret: '12345678900012',
			vatNumber: 'FR12345678901',
			apeCode: '9313Z'
		});
	});

	it.each([
		['siret', '1234'],
		['vatNumber', '12'],
		['apeCode', 'abc'],
		['email', 'pas-un-email'],
		['website', 'thower.com'],
		['logoUrl', '//exemple.com/logo.png'],
		['logoUrl', 'http://exemple.com/logo.png']
	])('refuse %s = %s', (field, value) => {
		const result = parse({ [field]: value });
		expect(result.success).toBe(false);
		expect(!result.success && result.error.issues[0].path[0]).toBe(field);
	});

	it('accepte un logo du site ou en https', () => {
		expect(parse({ logoUrl: '/logo-app.png' }).success).toBe(true);
		expect(parse({ logoUrl: 'https://cdn.exemple.com/logo.png' }).success).toBe(true);
	});
});

describe('affichage de la fiche', () => {
	const full = {
		...DEFAULT_COMPANY,
		legalName: 'Thower SAS',
		legalForm: 'SAS',
		shareCapital: '10 000 €',
		siret: '12345678900012',
		rcs: 'RCS Paris B 123 456 789',
		vatNumber: 'FR12345678901',
		apeCode: '9313Z',
		addressLine1: '1 rue de la Paix',
		postalCode: '75002',
		city: 'Paris',
		country: 'France'
	};

	it('prend la raison sociale, à défaut le nom affiché', () => {
		expect(companyLegalName(full)).toBe('Thower SAS');
		expect(companyLegalName(DEFAULT_COMPANY)).toBe('Thower');
	});

	it('ne liste que les lignes renseignées', () => {
		expect(companyAddressLines(full)).toEqual(['1 rue de la Paix', '75002 Paris', 'France']);
		expect(companyAddressLines(DEFAULT_COMPANY)).toEqual([]);
		expect(companyIdentityLines(full)).toEqual([
			'SAS au capital de 10 000 €',
			'SIRET : 123 456 789 00012',
			'RCS Paris B 123 456 789',
			'TVA intracommunautaire : FR12345678901',
			'Code APE : 9313Z'
		]);
		expect(companyIdentityLines(DEFAULT_COMPANY)).toEqual([]);
	});

	it('met le SIRET en forme sans toucher une valeur inattendue', () => {
		expect(formatSiret('12345678900012')).toBe('123 456 789 00012');
		expect(formatSiret('abc')).toBe('abc');
	});

	it('compose le copyright et détecte une identité d’éditeur complète', () => {
		expect(copyrightLine(full, 2027)).toBe('© 2027 Thower · Tous droits réservés');
		expect(hasPublisherIdentity(full)).toBe(true);
		expect(hasPublisherIdentity(DEFAULT_COMPANY)).toBe(false);
	});
});
