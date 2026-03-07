<script lang="ts">
	import { goto } from '$app/navigation';
	import jsPDF from 'jspdf';

	let { data } = $props();

	$effect(() => {
		if (!data?.transaction) {
			throw new Error('Transaction not found');
		}
	});

	function generatePDF() {
		const transaction = data.transaction;
		const doc = new jsPDF();

		doc.setFontSize(16);
		doc.text("BORDEREAU DE PAIEMENT", 14, 20);

		doc.setFontSize(12);
		doc.text(`ID Transaction: ${transaction.id}`, 14, 35);
		doc.text(`Montant: ${transaction.amount} ${(transaction.currency || 'eur').toUpperCase()}`, 14, 45);
		doc.text(`Date: ${new Date(transaction.createdAt).toLocaleString()}`, 14, 55);
		doc.text(`Statut: ${transaction.status}`, 14, 65);

		doc.setFontSize(14);
		doc.text('Client:', 14, 85);
		doc.setFontSize(12);
		doc.text(transaction.customer_details_name || 'N/A', 14, 95);
		doc.text(transaction.customer_details_email || 'N/A', 14, 105);

		doc.save(`Bordereau_${transaction.id}.pdf`);
	}

	$effect(() => {
		setTimeout(generatePDF, 10);
		goto('/admin/sales/');
	});
</script>

<h1 class="text-2xl font-bold m-5">Préparation du bordereau</h1>
