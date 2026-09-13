<script lang="ts">
	import Table from '$components/Table.svelte';
	import { formatDate } from '$lib/utils/formatDate';
	import FileText from 'lucide-svelte/icons/file-text';
	import Receipt from 'lucide-svelte/icons/receipt';
	import Download from 'lucide-svelte/icons/download';
	import jsPDF from 'jspdf';
	import autoTable from 'jspdf-autotable';

	// Props
	let { data } = $props();
	const transactions = $derived(data.transactions ?? []);
	const defaultYear = $derived(
		transactions.length > 0
			? new Date(transactions[0].createdAt).getFullYear()
			: new Date().getFullYear()
	);
	let startDate = $state('');
	let endDate = $state('');
	let exportError = $state('');

	$effect(() => {
		if (!startDate || !endDate) {
			startDate = `${defaultYear}-07-01`;
			endDate = `${defaultYear}-08-31`;
		}
	});

	function parseDateInput(value: string, endOfDay = false) {
		return new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
	}

	function exportRevenuePDF() {
		exportError = '';
		const periodStart = parseDateInput(startDate);
		const periodEnd = parseDateInput(endDate, true);

		if (
			!startDate ||
			!endDate ||
			Number.isNaN(periodStart.getTime()) ||
			Number.isNaN(periodEnd.getTime()) ||
			periodStart > periodEnd
		) {
			exportError = 'Sélectionnez une période valide.';
			return;
		}

		const periodTransactions = transactions.filter((transaction) => {
			const createdAt = new Date(transaction.createdAt);
			return transaction.status === 'paid' && createdAt >= periodStart && createdAt <= periodEnd;
		});
		const totalsByCurrency = new Map<string, number>();
		for (const transaction of periodTransactions) {
			const currency = (transaction.currency || 'EUR').toUpperCase();
			totalsByCurrency.set(
				currency,
				(totalsByCurrency.get(currency) ?? 0) + (transaction.amount ?? 0)
			);
		}

		const doc = new jsPDF();
		doc.setFontSize(18);
		doc.text("Chiffre d'affaires", 14, 20);
		doc.setFontSize(10);
		doc.text(`Période : ${startDate} au ${endDate}`, 14, 28);
		doc.text(`Paiements encaissés : ${periodTransactions.length}`, 14, 35);
		let totalY = 43;
		for (const [currency, total] of totalsByCurrency) {
			doc.setFontSize(12);
			doc.text(`Total ${currency} : ${total.toFixed(2)} ${currency}`, 14, totalY);
			totalY += 7;
		}
		if (periodTransactions.length === 0) {
			doc.setFontSize(12);
			doc.text('Aucun paiement encaissé sur cette période.', 14, totalY);
		}

		autoTable(doc, {
			startY: totalY + 8,
			head: [['Date', 'Client', 'Montant', 'Devise', 'Statut']],
			body: periodTransactions.map((transaction) => [
				new Date(transaction.createdAt).toLocaleDateString('fr-FR'),
				transaction.customer_details_name || transaction.customer_details_email || 'Client inconnu',
				(transaction.amount ?? 0).toFixed(2),
				(transaction.currency || 'EUR').toUpperCase(),
				transaction.status
			])
		});

		doc.save(`CA_${startDate}_${endDate}.pdf`);
	}

	const userColumns = $state([
		{ key: 'amount', label: 'Montant' },
		{ key: 'status', label: 'Statut' },
		{ key: 'customer_details_name', label: 'Nom client' },
		{ key: 'customer_details_email', label: 'Email client' },
		{ key: 'app_user_email', label: 'Email compte' },
		{ key: 'app_user_name', label: 'Nom compte' },
		{
			key: 'createdAt',
			label: 'Date',
			formatter: (v: unknown) => (v != null && v !== '' ? formatDate(String(v)) : '')
		}
	]);

	const transactionActions = $state([
		{
			type: 'link',
			name: 'facture',
			url: (item: any) => `/admin/sales/facture/${item.id}`,
			icon: Receipt
		},
		{
			type: 'link',
			name: 'bordereau',
			url: (item: any) => `/admin/sales/bordereau/${item.id}`,
			icon: FileText
		}
	]);
</script>

<div class="mb-6 rounded-lg border border-white/10 bg-white/[0.02] p-4 sm:p-5">
	<div class="mb-4">
		<h1 class="text-xl font-semibold text-white">Exporter le chiffre d'affaires</h1>
		<p class="mt-1 text-sm text-white/60">Les paiements encaissés seront regroupés dans un PDF.</p>
	</div>
	<div class="flex flex-col gap-4 sm:flex-row sm:items-end">
		<label class="flex flex-col gap-1 text-sm text-white/70">
			<span>Du</span>
			<input
				class="rounded border border-white/15 bg-black/30 px-3 py-2 text-white"
				type="date"
				bind:value={startDate}
			/>
		</label>
		<label class="flex flex-col gap-1 text-sm text-white/70">
			<span>Au</span>
			<input
				class="rounded border border-white/15 bg-black/30 px-3 py-2 text-white"
				type="date"
				bind:value={endDate}
			/>
		</label>
		<button
			class="inline-flex items-center justify-center gap-2 rounded bg-cyan-500 px-4 py-2 font-medium text-black transition hover:bg-cyan-400"
			type="button"
			onclick={exportRevenuePDF}
		>
			<Download size={17} />
			Exporter le PDF
		</button>
	</div>
	{#if exportError}
		<p class="mt-3 text-sm text-red-300" role="alert">{exportError}</p>
	{/if}
</div>

<!-- UI Table -->
<div class="ccc w-[100%]">
	<Table name="Ventes" columns={userColumns} data={transactions} actions={transactionActions} />
</div>
