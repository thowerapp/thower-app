<script lang="ts">
	import { goto } from '$app/navigation';
	import jsPDF from 'jspdf';

	let { data } = $props();

	$effect(() => {
		if (!data?.transaction) {
			throw new Error('Transaction not found');
		}
	});

	async function getBase64Image(url: string): Promise<string> {
		const response = await fetch(url);
		const blob = await response.blob();
		return new Promise((resolve) => {
			const reader = new FileReader();
			reader.onloadend = () => resolve(reader.result as string);
			reader.readAsDataURL(blob);
		});
	}

	async function generateInvoicePDF() {
		const transaction = data.transaction;
		const doc = new jsPDF();

		const logoBase64 = await getBase64Image('/Logo-xplicit.png');

		const companyName = 'Xplicit Web';
		const companyAddress = '123 Rue des Affaires';
		const companyCity = '75000 Paris, France';

		const customerName = transaction.customer_details_name || 'N/A';
		const customerEmail = transaction.customer_details_email || 'N/A';
		const invoiceDate = new Date(transaction.createdAt).toLocaleString();
		const totalAmount = transaction.amount.toFixed(2);
		const currency = (transaction.currency || 'eur').toUpperCase();

		doc.setFontSize(16);
		doc.setFont('helvetica', 'bold');
		doc.text('FACTURE', 105, 20, { align: 'center' });

		doc.addImage(logoBase64, 'PNG', 10, 10, 60, 20);

		doc.setFontSize(10);
		doc.setFont('helvetica', 'normal');
		doc.text(companyName, 14, 40);
		doc.text(companyAddress, 14, 46);
		doc.text(companyCity, 14, 52);

		doc.text('Facturé à :', 130, 40);
		doc.text(customerName, 130, 46);
		doc.text(`Email: ${customerEmail}`, 130, 52);

		doc.setFontSize(12);
		doc.text(`Numéro: ${transaction.id}`, 14, 80);
		doc.text(`Date: ${invoiceDate}`, 14, 86);
		doc.text(`Statut: ${transaction.status}`, 14, 92);

		doc.setFont('helvetica', 'bold');
		doc.text(`Total: ${totalAmount} ${currency}`, 14, 110);

		doc.setFontSize(10);
		doc.setFont('helvetica', 'italic');
		doc.text('Merci pour votre confiance !', 105, 140, { align: 'center' });

		doc.save(`Facture_${transaction.id}.pdf`);
	}

	$effect(() => {
		generateInvoicePDF();
		goto('/auth/factures');
	});
</script>

<h1 class="text-2xl font-bold m-5">Préparation de la facture</h1>
