<script lang="ts">
	import Chart from '$lib/components/Chart.svelte';
	import ChartMonthly from '$lib/components/ChartMonthly.svelte';
	import LastInscriptions from '$lib/components/LastInscriptions.svelte';
	import SEO from '$lib/components/SEO.svelte';

	/**
	 * Les props reçues : `data` doit contenir { transactions: [...] }
	 * Chaque transaction a la forme :
	 * {
	 *   amount: number,
	 *   app_user_email: string,
	 *   createdAt: Date | string,
	 *   status: string,
	 *   ...
	 * }
	 */
	let { data } = $props();

	//console.log(data, 'iugoiluhg');

	// Sécuriser l'accès au tableau de transactions
	const transactions = $derived(Array.isArray(data.transactions) ? data.transactions : []);

	const monthlyData = $derived.by(() => {
		const t = transactions;
		if (t.length === 0) return [];
		const firstTxDate = new Date(t[0].createdAt);
		const year = firstTxDate.getFullYear();
		const month = firstTxDate.getMonth();
		const daysInMonth = new Date(year, month + 1, 0).getDate();
		const dailySums = new Array(daysInMonth).fill(0);
		for (const tx of t) {
			const d = new Date(tx.createdAt);
			dailySums[d.getDate() - 1] += tx.amount ?? 0;
		}
		for (let i = 1; i < daysInMonth; i++) {
			dailySums[i] += dailySums[i - 1];
		}
		return dailySums.map((sum, idx) => ({ x: idx + 1, y: sum }));
	});

	const monthlySeries = $derived([
		{
			name: 'Cumulative Orders',
			data: monthlyData
		}
	]);

	type TxWithProducts = { products?: Array<{ name?: string; quantity?: number }> };
	const productSalesData = $derived.by(() => {
		const t = transactions;
		if (t.length === 0) return [];
		const productSalesMap = new Map<string, number>();
		for (const tx of t as TxWithProducts[]) {
			const products = tx.products;
			if (products && Array.isArray(products)) {
				for (const product of products) {
					const productName = (product?.name as string) ?? '';
					const productQuantity = product?.quantity || 0;
					productSalesMap.set(productName, (productSalesMap.get(productName) ?? 0) + productQuantity);
				}
			}
		}
		return Array.from(productSalesMap.entries()).map(([key, value]) => ({ x: key, y: value }));
	});
</script>

<!-- SEO pour la page d'administration -->
<SEO pageKey="admin" />
<div class="container w-[100vw] h-full mx-auto px-4 py-8">
<div class="csc m-5">
	<h1 class="text-2xl font-bold mb-4">Accueil</h1>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<!-- (1) Smooth Line Chart simple -->
		<div class="border p-5 rounded aspect-video">
			<Chart
				data={transactions}
				options={{
					title: {
						text: 'Smooth Line Chart of Transactions',
						align: 'center'
					},
					chart: {
						type: 'line'
					},
					stroke: {
						curve: 'smooth'
					}
				}}
			/>
		</div>

		<!-- (2) Line Chart cumul mensuel -->
		<div class="border p-5 rounded aspect-video">
			<ChartMonthly
				data={monthlySeries}
				options={{
					title: {
						text: 'Monthly Cumulative Orders',
						align: 'center'
					},
					chart: {
						type: 'line'
					},
					stroke: {
						curve: 'smooth'
					},
					xaxis: {
						type: 'numeric',
						title: {
							text: 'Day of Month'
						}
					},
					yaxis: {
						title: {
							text: 'Cumulative Amount'
						}
					}
				}}
			/>
		</div>
		<LastInscriptions users={data.latestUsersFetch} />

		<!-- Nouveau graphique à barres -->
		<div class="border p-5 rounded aspect-video">
			<Chart
				data={productSalesData}
				options={{
					title: {
						text: 'Produits vendus',
						align: 'center'
					},
					chart: {
						type: 'bar'
					},
					xaxis: {
						categories: productSalesData.map((d) => d.x),
						title: {
							text: 'Produits'
						}
					},
					yaxis: {
						title: {
							text: 'Quantité vendue'
						}
					},
					series: [
						{
							name: 'Quantité',
							data: productSalesData.map((d) => d.y)
						}
					]
				}}
			/>
		</div>
	</div>
</div>
</div>