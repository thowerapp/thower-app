<script lang="ts">
    import Chart from '$lib/components/Chart.svelte';
    import ChartMonthly from '$lib/components/ChartMonthly.svelte';
    import LastInscriptions from '$lib/components/LastInscriptions.svelte';
    import SEO from '$lib/components/SEO.svelte';

    let { data } = $props();

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
        { name: 'Cumulative Orders', data: monthlyData }
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

<div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
    <!-- Header Section -->
    <div class="mb-6 sm:mb-8 lg:mb-12">
        <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 font-['DM_Sans'] tracking-wide">
            Accueil
        </h1>
        <p class="text-sm sm:text-base text-white/50 font-['DM_Sans'] font-light leading-relaxed">
            Vue d'ensemble des statistiques et des activités
        </p>
    </div>

    <!-- Grid Layout - Mobile First (1 col → 2 cols on md/lg) -->
    <div class="grid grid-cols-1 gap-4 sm:gap-5 md:gap-6 lg:grid-cols-2">
        
        <!-- Chart 1: Transaction Timeline (Cyan accent) -->
        <div class="w-full h-80 sm:h-96 lg:h-[400px] rounded-lg border border-white/10 bg-white/[0.02] p-4 sm:p-5 hover:border-cyan-400/30 transition-all duration-200">
            <div class="mb-3">
                <h2 class="text-sm font-['DM_Sans'] font-medium text-cyan-400 uppercase tracking-widest">
                    Transactions
                </h2>
            </div>
            <Chart
                data={transactions}
                options={{
                    title: { text: '', align: 'center' },
                    chart: { type: 'line', background: 'transparent', toolbar: { show: false } },
                    stroke: { curve: 'smooth', width: 2, colors: ['#3ab8b8'] },
                    grid: { show: false },
                    xaxis: { labels: { show: false } },
                    yaxis: { labels: { style: { colors: '#f0ede8' } } }
                }}
            />
        </div>

        <!-- Chart 2: Monthly Cumulative (Gold accent) -->
        <div class="w-full h-80 sm:h-96 lg:h-[400px] rounded-lg border border-white/10 bg-white/[0.02] p-4 sm:p-5 hover:border-yellow-400/30 transition-all duration-200">
            <div class="mb-3">
                <h2 class="text-sm font-['DM_Sans'] font-medium text-yellow-500 uppercase tracking-widest">
                    Cumul Mensuel
                </h2>
            </div>
            <ChartMonthly
                data={monthlySeries}
                options={{
                    title: { text: '', align: 'center' },
                    chart: { type: 'line', background: 'transparent', toolbar: { show: false } },
                    stroke: { curve: 'smooth', width: 2, colors: ['#c9a84c'] },
                    grid: { show: false },
                    xaxis: { type: 'numeric', labels: { style: { colors: '#f0ede8' } } },
                    yaxis: { labels: { style: { colors: '#f0ede8' } } }
                }}
            />
        </div>

        <!-- Last Inscriptions - Full Width on Mobile, Span 2 on Desktop -->
        <div class="w-full lg:col-span-2 rounded-lg border border-white/10 bg-white/[0.02] p-4 sm:p-5 hover:border-white/20 transition-all duration-200">
            <div class="mb-4">
                <h2 class="text-base sm:text-lg font-['DM_Sans'] font-medium text-white tracking-tight">
                    Dernières Inscriptions
                </h2>
            </div>
            <LastInscriptions users={data.latestUsersFetch} />
        </div>

        <!-- Chart 3: Products Sales - Full Width -->
        <div class="w-full lg:col-span-2 h-80 sm:h-96 rounded-lg border border-white/10 bg-white/[0.02] p-4 sm:p-5 hover:border-white/20 transition-all duration-200">
            <div class="mb-3">
                <h2 class="text-sm font-['DM_Sans'] font-medium text-cyan-400 uppercase tracking-widest">
                    Produits Vendus
                </h2>
            </div>
            <Chart
                data={productSalesData}
                options={{
                    title: { text: '', align: 'center' },
                    chart: { type: 'bar', background: 'transparent', toolbar: { show: false } },
                    xaxis: {
                        categories: productSalesData.map((d) => d.x),
                        labels: { style: { colors: '#f0ede8', fontSize: '11px' }, maxHeight: 120 }
                    },
                    yaxis: { labels: { style: { colors: '#f0ede8' } } },
                    series: [{ name: 'Quantité', data: productSalesData.map((d) => d.y) }],
                    colors: ['#3ab8b8'],
                    grid: { show: false }
                }}
            />
        </div>
    </div>
</div>

<style lang="postcss">
    /* ─────────────────────────────────────────── */
    /* Harmony with THOWER Design System */
    /* ─────────────────────────────────────────── */
    
    /* Typography - DM Sans for all text */
    :global(h1, h2, h3, h4, h5, h6) {
        font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
        font-weight: 500;
        letter-spacing: 0.02em;
        color: #f0ede8;
    }

    :global(p, body) {
        font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
        font-weight: 300;
        line-height: 1.6;
        color: #f0ede8;
    }

    /* Background harmony */
    :global(body) {
        background: #0a0a0a;
    }

    /* Chart text styling */
    :global(svg text) {
        font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
        fill: #f0ede8;
        font-size: 12px;
    }

    /* Cyan accent for section titles */
    :global(.text-cyan-400) {
        color: #3ab8b8;
    }

    /* Gold accent for interactive elements */
    :global(.text-yellow-500) {
        color: #c9a84c;
    }

    /* Border and background opacity */
    :global(.border-white\/10) {
        border-color: rgba(240, 237, 232, 0.1);
    }

    :global(.bg-white\/\[0\.02\]) {
        background-color: rgba(240, 237, 232, 0.02);
    }

    :global(.hover\:border-cyan-400\/30:hover) {
        border-color: rgba(58, 184, 184, 0.3);
    }

    /* Responsive font scaling */
    @media (max-width: 640px) {
        :global(.text-4xl) {
            font-size: 1.875rem;
            line-height: 2.25rem;
        }
    }

    @media (min-width: 768px) {
        :global(.grid) {
            gap: 1.5rem;
        }
    }

    @media (min-width: 1024px) {
        :global(.max-w-7xl) {
            max-width: 80rem;
        }
    }
</style>