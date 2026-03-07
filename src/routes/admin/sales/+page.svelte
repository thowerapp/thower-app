<script lang="ts">
	import Table from '$components/Table.svelte';
	import { formatDate } from '$lib/utils/formatDate';
	import FileText from 'lucide-svelte/icons/file-text';
	import Receipt from 'lucide-svelte/icons/receipt';

	// Props
	let { data } = $props();

	const userColumns = $state([
		{ key: 'amount', label: 'Montant' },
		{ key: 'status', label: 'Statut' },
		{ key: 'customer_details_name', label: 'Nom client' },
		{ key: 'customer_details_email', label: 'Email client' },
		{ key: 'app_user_email', label: 'Email compte' },
		{ key: 'app_user_name', label: 'Nom compte' },
		{ key: 'createdAt', label: 'Date', formatter: (v: unknown) => (v != null && v !== '' ? formatDate(String(v)) : '') }
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

<!-- UI Table -->
<div class="ccc w-[100%]">
	<Table
		name="Ventes"
		columns={userColumns}
		data={data.transactions ?? []}
		actions={transactionActions}
	/>
</div>
