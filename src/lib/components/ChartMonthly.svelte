<script lang="ts">
	let chartElement = $state<HTMLElement>();
	let chartInstance = $state<any>();

	let { data = [], options = {} } = $props();

	$effect(() => {
		if (typeof window === 'undefined') return;

		let currentInstance: typeof chartInstance = undefined;
		let cancelled = false;

		(async () => {
			const ApexCharts = (await import('apexcharts')).default;

			const defaultOptions = {
				chart: { type: 'line', height: '100%' },
				series: data
			};

			const mergedOptions = {
				...defaultOptions,
				...options,
				chart: {
					...defaultOptions.chart,
					...options.chart
				}
			};

			if (cancelled) return;
			currentInstance = new ApexCharts(chartElement, mergedOptions);
			await currentInstance.render();
			if (cancelled && currentInstance) {
				currentInstance.destroy();
			}
		})();

		return () => {
			cancelled = true;
			if (currentInstance) {
				currentInstance.destroy();
				currentInstance = undefined;
			}
		};
	});
</script>

<div class="chart-container">
	<div bind:this={chartElement} class="chartCSS"></div>
</div>

<style>
	.chart-container {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		height: 100%;
	}

	.chartCSS {
		width: 80%;
		height: 80%;
	}
</style>
