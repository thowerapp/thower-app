<script lang="ts">
	import { goto } from '$app/navigation';
	import { generateInvoicePdf } from '$lib/pdf/generateInvoicePdf';

	let { data } = $props();

	$effect(() => {
		if (!data?.transaction) {
			throw new Error('Transaction not found');
		}
	});

	$effect(() => {
		generateInvoicePdf(data.transaction);
		goto('/admin/sales');
	});
</script>

<h1 class="text-2xl font-bold m-5">Préparation de la facture</h1>
