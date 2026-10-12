import type { Transaction } from '@prisma/client';
import {
	companyAddressLines,
	companyIdentityLines,
	companyLegalName,
	type CompanyProfileData
} from '$lib/company/companyProfile';

type Logo = { dataUrl: string; format: 'PNG' | 'JPEG' };

/** Logo de l'entreprise, ou null s'il est absent ou illisible : la facture doit se générer sans lui. */
async function loadLogo(url: string | null): Promise<Logo | null> {
	if (!url) return null;
	try {
		const response = await fetch(url);
		const type = response.headers.get('content-type') ?? '';
		// jsPDF n'embarque que le PNG et le JPEG.
		const format = type.startsWith('image/png')
			? 'PNG'
			: type.startsWith('image/jpeg')
				? 'JPEG'
				: null;
		if (!response.ok || !format) return null;
		const blob = await response.blob();
		const dataUrl = await new Promise<string>((resolve) => {
			const reader = new FileReader();
			reader.onloadend = () => resolve(reader.result as string);
			reader.readAsDataURL(blob);
		});
		return { dataUrl, format };
	} catch {
		return null;
	}
}

/** Génère et déclenche le téléchargement du PDF de facture pour une transaction. */
export async function generateInvoicePdf(
	transaction: Transaction,
	company: CompanyProfileData
): Promise<void> {
	const { default: jsPDF } = await import('jspdf');
	const doc = new jsPDF();

	const logo = await loadLogo(company.logoUrl);

	const customerName = transaction.customer_details_name || 'N/A';
	const customerEmail = transaction.customer_details_email || 'N/A';
	const invoiceDate = new Date(transaction.createdAt).toLocaleString();
	const totalAmount = transaction.amount.toFixed(2);
	const currency = (transaction.currency || 'eur').toUpperCase();

	doc.setFontSize(16);
	doc.setFont('helvetica', 'bold');
	doc.text('FACTURE', 105, 20, { align: 'center' });

	if (logo) doc.addImage(logo.dataUrl, logo.format, 10, 10, 60, 20);

	// Émetteur : raison sociale, adresse, identité juridique, contact.
	doc.setFontSize(10);
	doc.setFont('helvetica', 'bold');
	let y = 40;
	doc.text(companyLegalName(company), 14, y);
	doc.setFont('helvetica', 'normal');
	const contact = [company.email, company.phone].filter(Boolean).join(' · ');
	for (const line of [
		...companyAddressLines(company),
		...companyIdentityLines(company),
		...(contact ? [contact] : [])
	]) {
		y += 6;
		doc.text(line, 14, y, { maxWidth: 100 });
	}

	doc.text('Facturé à :', 130, 40);
	doc.text(customerName, 130, 46);
	doc.text(`Email: ${customerEmail}`, 130, 52);

	y = Math.max(y + 16, 80);
	doc.setFontSize(12);
	doc.text(`Numéro: ${transaction.id}`, 14, y);
	doc.text(`Date: ${invoiceDate}`, 14, y + 6);
	doc.text(`Statut: ${transaction.status}`, 14, y + 12);

	doc.setFont('helvetica', 'bold');
	doc.text(`Total: ${totalAmount} ${currency}`, 14, y + 30);

	doc.setFontSize(10);
	doc.setFont('helvetica', 'italic');
	if (company.invoiceNote) doc.text(company.invoiceNote, 14, y + 46, { maxWidth: 180 });
	doc.text('Merci pour votre confiance !', 105, y + 66, { align: 'center' });

	doc.save(`Facture_${transaction.id}.pdf`);
}
