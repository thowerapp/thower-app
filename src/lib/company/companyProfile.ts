/**
 * Fiche de l'entreprise : ce que l'admin saisit une fois et que le site, les mentions légales
 * et les PDF reprennent. Code partagé client / serveur (aucun accès base ici).
 */
import { z } from 'zod';

export type CompanyProfileData = {
	brandName: string;
	legalName: string | null;
	legalForm: string | null;
	shareCapital: string | null;
	siret: string | null;
	rcs: string | null;
	vatNumber: string | null;
	apeCode: string | null;
	addressLine1: string | null;
	addressLine2: string | null;
	postalCode: string | null;
	city: string | null;
	country: string | null;
	email: string | null;
	phone: string | null;
	website: string | null;
	publicationDirector: string | null;
	hostName: string | null;
	hostAddress: string | null;
	hostWebsite: string | null;
	logoUrl: string | null;
	invoiceNote: string | null;
};

export const COMPANY_TEXT_FIELDS = [
	'legalName',
	'legalForm',
	'shareCapital',
	'siret',
	'rcs',
	'vatNumber',
	'apeCode',
	'addressLine1',
	'addressLine2',
	'postalCode',
	'city',
	'country',
	'email',
	'phone',
	'website',
	'publicationDirector',
	'hostName',
	'hostAddress',
	'hostWebsite',
	'logoUrl',
	'invoiceNote'
] as const;

/** Valeurs tant que l'admin n'a rien enregistré : le site se comporte comme avant. */
export const DEFAULT_COMPANY: CompanyProfileData = {
	brandName: 'Thower',
	legalName: null,
	legalForm: null,
	shareCapital: null,
	siret: null,
	rcs: null,
	vatNumber: null,
	apeCode: null,
	addressLine1: null,
	addressLine2: null,
	postalCode: null,
	city: null,
	country: null,
	email: null,
	phone: null,
	website: null,
	publicationDirector: null,
	hostName: null,
	hostAddress: null,
	hostWebsite: null,
	logoUrl: null,
	invoiceNote: null
};

const trimmed = (v: unknown) => (typeof v === 'string' ? v.trim() : v);
const emptyToNull = (v: unknown) => (v === '' || v == null ? null : v);

/** Champ texte facultatif : espaces retirés, vide = absent. */
const optional = (max: number, extra?: (s: z.ZodString) => z.ZodString) =>
	z.preprocess(
		(v) => emptyToNull(trimmed(v)),
		(extra ? extra(z.string().max(max)) : z.string().max(max)).nullable()
	);

/** Identifiant saisi avec des espaces (SIRET, TVA, APE) : espaces retirés, vide = absent. */
const compactId = (pattern: RegExp, message: string, upper = false) =>
	z.preprocess((v) => {
		if (typeof v !== 'string') return emptyToNull(v);
		const c = v.replace(/\s+/g, '');
		return c === '' ? null : upper ? c.toUpperCase() : c;
	}, z.string().regex(pattern, message).nullable());

export const companyFormSchema = z.object({
	brandName: z.preprocess(trimmed, z.string().min(1, 'Le nom affiché est obligatoire.').max(80)),
	legalName: optional(120),
	legalForm: optional(60),
	shareCapital: optional(60),
	siret: compactId(/^\d{14}$/, 'Le SIRET compte 14 chiffres.'),
	rcs: optional(80),
	vatNumber: compactId(
		/^[A-Z]{2}[A-Z0-9]{2,12}$/,
		'Numéro de TVA invalide (ex. FR12345678901).',
		true
	),
	apeCode: compactId(/^\d{4}[A-Z]$/, 'Code APE invalide (ex. 9313Z).', true),
	addressLine1: optional(160),
	addressLine2: optional(160),
	postalCode: optional(12),
	city: optional(80),
	country: optional(60),
	email: optional(160, (s) => s.email('Adresse e-mail invalide.')),
	phone: optional(30),
	website: optional(200, (s) =>
		s.regex(/^https?:\/\/\S+$/, 'L’adresse du site doit commencer par https://.')
	),
	publicationDirector: optional(120),
	hostName: optional(120),
	hostAddress: optional(240),
	hostWebsite: optional(200, (s) =>
		s.regex(/^https?:\/\/\S+$/, 'L’adresse du site doit commencer par https://.')
	),
	logoUrl: optional(300, (s) =>
		s.regex(
			/^(\/(?!\/)\S*|https:\/\/\S+)$/,
			'Le logo est un chemin du site (/logo.png) ou une adresse https://.'
		)
	),
	invoiceNote: optional(500)
});

export type CompanyFormInput = z.input<typeof companyFormSchema>;

/** Nom légal pour les documents : raison sociale, à défaut nom affiché. */
export function companyLegalName(c: CompanyProfileData): string {
	return c.legalName ?? c.brandName;
}

/** Lignes d'adresse non vides, dans l'ordre d'un courrier. */
export function companyAddressLines(c: CompanyProfileData): string[] {
	const cityLine = [c.postalCode, c.city].filter(Boolean).join(' ');
	return [c.addressLine1, c.addressLine2, cityLine, c.country].filter((l): l is string => !!l);
}

/** Identité juridique (forme, capital, SIRET, RCS, TVA, APE) : seules les lignes renseignées. */
export function companyIdentityLines(c: CompanyProfileData): string[] {
	const lines: string[] = [];
	const form = [c.legalForm, c.shareCapital ? `au capital de ${c.shareCapital}` : null]
		.filter(Boolean)
		.join(' ');
	if (form) lines.push(form);
	if (c.siret) lines.push(`SIRET : ${formatSiret(c.siret)}`);
	if (c.rcs) lines.push(c.rcs);
	if (c.vatNumber) lines.push(`TVA intracommunautaire : ${c.vatNumber}`);
	if (c.apeCode) lines.push(`Code APE : ${c.apeCode}`);
	return lines;
}

/** 123 456 789 00012 */
export function formatSiret(siret: string): string {
	return /^\d{14}$/.test(siret)
		? `${siret.slice(0, 3)} ${siret.slice(3, 6)} ${siret.slice(6, 9)} ${siret.slice(9)}`
		: siret;
}

export function copyrightLine(c: CompanyProfileData, year: number): string {
	return `© ${year} ${c.brandName} · Tous droits réservés`;
}

/** true si une raison sociale et une adresse permettent d'identifier l'éditeur (mentions légales). */
export function hasPublisherIdentity(c: CompanyProfileData): boolean {
	return !!(c.legalName ?? c.brandName) && companyAddressLines(c).length > 0;
}
