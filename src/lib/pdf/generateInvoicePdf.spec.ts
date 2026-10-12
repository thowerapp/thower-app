import type { Transaction } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompanyProfileData } from '$lib/company/companyProfile';
import { DEFAULT_COMPANY } from '$lib/company/companyProfile';

const calls = vi.hoisted(() => ({ text: [] as string[], images: [] as unknown[][], saved: [] as string[] }));

vi.mock('jspdf', () => ({
	default: class {
		setFontSize() {}
		setFont() {}
		text(value: string) {
			calls.text.push(value);
		}
		addImage(...args: unknown[]) {
			calls.images.push(args);
		}
		save(name: string) {
			calls.saved.push(name);
		}
	}
}));

import { generateInvoicePdf } from './generateInvoicePdf';

const transaction = {
	id: 'tx1',
	amount: 249.99,
	currency: 'eur',
	status: 'paid',
	customer_details_name: 'Camille Test',
	customer_details_email: 'camille@test.local',
	createdAt: new Date('2026-10-01T10:00:00Z')
} as unknown as Transaction;

const company: CompanyProfileData = {
	...DEFAULT_COMPANY,
	legalName: 'Thower SAS',
	addressLine1: '1 rue de Test',
	postalCode: '75001',
	city: 'Paris',
	siret: '12345678900011',
	email: 'contact@thower.test',
	phone: '0102030405',
	invoiceNote: 'TVA non applicable.'
};

function stubFetch(response: { ok?: boolean; type?: string } | 'throw') {
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => {
			if (response === 'throw') throw new Error('réseau');
			return { ok: response.ok ?? true, headers: new Headers({ 'content-type': response.type ?? '' }), blob: async () => new Blob(['x']) };
		})
	);
}

beforeEach(() => {
	calls.text.length = 0;
	calls.images.length = 0;
	calls.saved.length = 0;
	vi.stubGlobal(
		'FileReader',
		class {
			result: string | null = null;
			onloadend: (() => void) | null = null;
			readAsDataURL() {
				this.result = 'data:image/png;base64,AAAA';
				this.onloadend?.();
			}
		}
	);
});
afterEach(() => vi.unstubAllGlobals());

describe('generateInvoicePdf', () => {
	it('écrit l’émetteur, le client, le total et la note, puis enregistre le fichier', async () => {
		await generateInvoicePdf(transaction, company);
		expect(calls.text).toEqual(expect.arrayContaining(['FACTURE', 'Thower SAS', 'Camille Test', 'Email: camille@test.local', 'Total: 249.99 EUR', 'TVA non applicable.', 'Merci pour votre confiance !']));
		expect(calls.text.some((line) => line.includes('contact@thower.test'))).toBe(true);
		expect(calls.saved).toEqual(['Facture_tx1.pdf']);
		expect(calls.images).toHaveLength(0);
	});

	it('remplace les champs client absents par « N/A » et la devise absente par EUR', async () => {
		await generateInvoicePdf({ ...transaction, customer_details_name: null, customer_details_email: null, currency: null } as unknown as Transaction, { ...company, invoiceNote: null, email: null, phone: null });
		expect(calls.text).toEqual(expect.arrayContaining(['N/A', 'Email: N/A', 'Total: 249.99 EUR']));
		expect(calls.text).not.toContain('TVA non applicable.');
	});

	it('ajoute le logo PNG ou JPEG de l’entreprise', async () => {
		stubFetch({ type: 'image/png' });
		await generateInvoicePdf(transaction, { ...company, logoUrl: '/logo.png' });
		expect(calls.images[0]?.[1]).toBe('PNG');

		calls.images.length = 0;
		stubFetch({ type: 'image/jpeg' });
		await generateInvoicePdf(transaction, { ...company, logoUrl: '/logo.jpg' });
		expect(calls.images[0]?.[1]).toBe('JPEG');
	});

	it('se génère sans logo quand il est absent, illisible, d’un format non géré ou en erreur', async () => {
		for (const response of [{ type: 'image/svg+xml' }, { ok: false, type: 'image/png' }, 'throw'] as const) {
			stubFetch(response);
			await generateInvoicePdf(transaction, { ...company, logoUrl: '/logo.x' });
		}
		expect(calls.images).toHaveLength(0);
		expect(calls.saved).toHaveLength(3);
	});
});
