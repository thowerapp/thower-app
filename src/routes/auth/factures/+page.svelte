<script lang="ts">
	import Table from '$components/Table.svelte';
	import { formatDate } from '$lib/utils/formatDate';
	import Receipt from 'lucide-svelte/icons/receipt';

	// Props
	let { data } = $props();

	const userColumns = $state([
		{ key: 'amount', label: 'Montant' },
		{ key: 'currency', label: 'Devise' },
		{ key: 'status', label: 'Statut' },
		{ key: 'customer_details_name', label: 'Nom' },
		{ key: 'customer_details_email', label: 'Email' },
		{ key: 'createdAt', label: 'Date', formatter: (v: unknown) => (v != null && v !== '' ? formatDate(String(v)) : '') }
	]);

	const transactionActions = $state([
		{
			type: 'link',
			name: 'facture',
			url: (item: any) => `/auth/factures/${item.id}`,
			icon: Receipt
		}
	]);
</script>

<!-- UI Table -->
<div class="ccc w-[100%]">
	<Table
		name="Factures"
		columns={userColumns}
		data={data.transactions ?? []}
		actions={transactionActions}
	/>
</div>
