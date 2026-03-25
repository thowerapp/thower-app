<script lang="ts">
	import * as Chart from '$shadcn/chart';
	import * as Card from '$shadcn/card';
	import { Badge } from '$shadcn/badge';
	import { Button } from '$shadcn/button';
	import { Calendar } from '$shadcn/calendar';
	import { CalendarDate, type DateValue } from '@internationalized/date';
	import { AreaChart, Area, LinearGradient, LineChart } from 'layerchart';
	import { scaleUtc, scaleBand } from 'd3-scale';
	import { curveNatural, curveLinearClosed } from 'd3-shape';
	import {
		Ruler, ArrowRight, CalendarRange,
		TrendingDown, TrendingUp, Repeat2, Minus, Zap
	} from 'lucide-svelte';

	export type MeasurementSafe = {
		id: string;
		createdAt: string | Date;
		weightKg?: number | null;
		waistCm?: number | null;
		chestCm?: number | null;
		armCm?: number | null;
		heightCm?: number | null;
		age?: number | null;
	};

	let {
		bodyMeasurements,
		onswitch
	}: {
		bodyMeasurements: MeasurementSafe[];
		onswitch: () => void;
	} = $props();

	type MetricKey    = 'weightKg' | 'waistCm' | 'chestCm' | 'armCm';
	type Quality      = 'excellent' | 'good' | 'neutral' | 'caution';
	type ProfileType  = 'loss' | 'gain' | 'recomposition' | 'maintenance' | 'mixed';

	const metricOptions: { key: MetricKey; label: string; unit: string; color: string }[] = [
		{ key: 'weightKg', label: 'Poids',          unit: 'kg', color: 'var(--chart-1)' },
		{ key: 'waistCm',  label: 'Tour de taille', unit: 'cm', color: 'var(--chart-2)' },
		{ key: 'chestCm',  label: 'Tour de torse',  unit: 'cm', color: 'var(--chart-3)' },
		{ key: 'armCm',    label: 'Tour de bras',   unit: 'cm', color: 'var(--chart-4)' }
	];

	const chartConfig = {
		weightKg: { label: 'Poids (kg)',          color: 'var(--chart-1)' },
		waistCm:  { label: 'Tour de taille (cm)', color: 'var(--chart-2)' },
		chestCm:  { label: 'Tour de torse (cm)',  color: 'var(--chart-3)' },
		armCm:    { label: 'Tour de bras (cm)',   color: 'var(--chart-4)' }
	} satisfies Chart.ChartConfig;

	// ── Filtre de période ─────────────────────────────────────
	type TimeRange = '30j' | '91j' | 'tout';
	const timeRanges: { id: TimeRange; label: string }[] = [
		{ id: '30j',  label: '30 j' },
		{ id: '91j',  label: '91 j' },
		{ id: 'tout', label: 'Tout' }
	];
	let timeRange = $state<TimeRange>('91j');

	const filteredMeasurements = $derived.by(() => {
		if (timeRange === 'tout') return bodyMeasurements;
		const days   = timeRange === '91j' ? 91 : 30;
		const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
		const f = bodyMeasurements.filter((m) => new Date(m.createdAt) >= cutoff);
		return f.length > 0 ? f : bodyMeasurements.slice(0, 1);
	});

	// ── Dérivations ───────────────────────────────────────────
	const histSorted = $derived([...filteredMeasurements].reverse());

	const activeMetrics = $derived(
		metricOptions.filter(
			(m) => histSorted.filter((d) => (d as Record<string, unknown>)[m.key] != null).length >= 2
		)
	);

	const baselines = $derived.by(() => {
		const result: Partial<Record<MetricKey, number>> = {};
		for (const m of metricOptions) {
			const first = histSorted.find((d) => (d as Record<string, unknown>)[m.key] != null);
			if (first) result[m.key] = (first as Record<string, unknown>)[m.key] as number;
		}
		return result;
	});

	const normalizedData = $derived(
		histSorted.map((m) => {
			const row: Record<string, unknown> = { date: new Date(m.createdAt) };
			for (const metric of activeMetrics) {
				const val  = (m as Record<string, unknown>)[metric.key] as number | null | undefined;
				const base = baselines[metric.key];
				if (val != null && base != null && base !== 0) {
					row[metric.key] = +((val - base) / base * 100).toFixed(2);
				}
			}
			return row;
		})
	);

	const latestEntry = $derived(filteredMeasurements[0] as MeasurementSafe | undefined);
	const oldestEntry = $derived(histSorted[0]            as MeasurementSafe | undefined);

	const periodDays = $derived.by(() => {
		if (!latestEntry || !oldestEntry || filteredMeasurements.length < 2) return 0;
		return Math.max(
			1,
			(new Date(latestEntry.createdAt).getTime() - new Date(oldestEntry.createdAt).getTime())
				/ (1000 * 60 * 60 * 24)
		);
	});

	// ── Radar ─────────────────────────────────────────────────
	const radarConfig = {
		debut:  { label: 'Début',  color: 'var(--muted-foreground)' },
		actuel: { label: 'Actuel', color: 'var(--chart-1)'          }
	} satisfies Chart.ChartConfig;

	const radarData = $derived.by(() => {
		if (!latestEntry) return [];
		return metricOptions
			.filter((m) => baselines[m.key] != null && (latestEntry?.[m.key] as number | null) != null)
			.map((m) => ({
				metric: m.label,
				debut:  100,
				actuel: +(((latestEntry![m.key] as number) / baselines[m.key]!) * 100).toFixed(1)
			}));
	});

	// ── Helpers ──────────────────────────────────────────────
	function getMetricDelta(key: MetricKey): { abs: number; pct: number } | null {
		const base = baselines[key];
		const curr = latestEntry?.[key] as number | null | undefined;
		if (base == null || curr == null) return null;
		return {
			abs: +(curr - base).toFixed(1),
			pct: +((curr - base) / base * 100).toFixed(1)
		};
	}

	function isGoodDelta(key: MetricKey, delta: number): boolean {
		return key === 'armCm' ? delta > 0 : delta < 0;
	}

	function getDelta(curr: number | null | undefined, prev: number | null | undefined) {
		if (curr == null || prev == null) return null;
		return +(curr - prev).toFixed(1);
	}

	// ── Détecteur de profil d'évolution ──────────────────────
	// Sources :
	//   - Taux optimal perte : 0.5–1% poids/semaine (OMS / Precision Nutrition)
	//   - Taux optimal prise de masse : 0.5–1% poids/mois
	//   - Recomposition : perte grasse + gain musculaire simultanés (NSCA 2020)
	//   - Tour de taille IDF : ≥94 cm (H) / ≥80 cm (F) = risque cardiovasculaire
	type ProfileInfo = {
		type:    ProfileType;
		title:   string;
		desc:    string;
		science: string;
		quality: Quality;
	};

	const profilePattern = $derived.by((): ProfileInfo | null => {
		if (filteredMeasurements.length < 2) return null;

		const wD     = getMetricDelta('weightKg');
		const waistD = getMetricDelta('waistCm');
		const armD   = getMetricDelta('armCm');
		const chestD = getMetricDelta('chestCm');

		const wLoss     = wD     && wD.abs     < -0.5;
		const wGain     = wD     && wD.abs     >  0.5;
		const wStable   = !wLoss && !wGain;
		const waistLoss = waistD && waistD.abs < -0.5;
		const armGain   = armD   && armD.abs   >  0.2;
		const chestGain = chestD && chestD.abs >  0.5;
		const muscleGain = armGain || chestGain;

		// Recomposition : perte + gain musculaire simultanés
		if (wLoss && muscleGain) return {
			type:    'recomposition',
			title:   'Recomposition corporelle',
			desc:    'Perte de graisse et gain musculaire simultanés — profil avancé',
			science: 'Possible chez les débutants, personnes en surpoids ou après reprise d\'entraînement. Rythme cible : −0,3 à −0,7% du poids/semaine. (NSCA 2020)',
			quality: 'excellent'
		};

		// Prise de masse propre : poids + volume musculaire
		if (wGain && muscleGain) return {
			type:    'gain',
			title:   'Prise de masse musculaire',
			desc:    'Augmentation du poids associée à un développement musculaire',
			science: 'Taux optimal : 0,5–1% du poids/mois. Au-delà, l\'excédent devient du gras. (The Bodybuilding Dietitians 2025)',
			quality: 'good'
		};

		// Perte de masse grasse
		if (wLoss && waistLoss) return {
			type:    'loss',
			title:   'Perte de masse grasse',
			desc:    'Réduction du poids et du périmètre abdominal confirmée',
			science: 'Taux optimal : 0,5–1% du poids/semaine. En dessous, risque de ralentissement métabolique ; au-dessus, risque de fonte musculaire. (OMS / Precision Nutrition)',
			quality: 'excellent'
		};

		// Maintien
		if (wStable) return {
			type:    'maintenance',
			title:   'Phase de maintien',
			desc:    'Stabilité du poids sur la période sélectionnée',
			science: 'Le maintien est une phase active à part entière, particulièrement après une perte significative. Elle permet la resensibilisation hormonale et la stabilisation.',
			quality: 'neutral'
		};

		// Mixte / non concluant
		return {
			type:    'mixed',
			title:   'Évolution mixte',
			desc:    'Variations plurielles sur la période — difficile à catégoriser',
			science: 'Élargissez la fenêtre temporelle pour identifier une tendance claire.',
			quality: 'neutral'
		};
	});

	// ── Interprétation qualitative enrichie ─────────────────
	// La fonction prend la valeur absolue actuelle pour le contexte IDF (tour de taille)
	// et le % du poids corporel par semaine (poids)
	function interpretMetric(
		key: MetricKey,
		delta: number,
		days: number,
		currentValue: number
	): { rateLabel: string; quality: Quality; text: string; context: string | null } {
		const perMonth = days > 0 ? (delta / days) * 30 : 0;
		const sign     = perMonth >= 0 ? '+' : '';

		if (key === 'weightKg') {
			const label      = `${sign}${perMonth.toFixed(1)} kg/mois`;
			const pctPerWeek = days > 0 ? (Math.abs(delta) / currentValue) * 100 / (days / 7) : 0;

			if (Math.abs(delta) <= 0.5) return {
				rateLabel: label, quality: 'neutral', text: 'Poids stable',
				context: null
			};
			if (delta > 0.5) return {
				rateLabel: label, quality: 'neutral', text: 'Prise de masse',
				context: pctPerWeek > 0.5 ? 'Au-delà du ratio optimal (0,5–1%/mois)' : null
			};
			// perte
			if (pctPerWeek <= 0.25) return {
				rateLabel: label, quality: 'good', text: 'Progression douce',
				context: 'Idéal pour athlètes secs ou préparation longue durée'
			};
			if (pctPerWeek <= 1.0) return {
				rateLabel: label, quality: 'excellent', text: 'Rythme recommandé',
				context: `${pctPerWeek.toFixed(2)}%/sem du poids — OMS ✓`
			};
			if (pctPerWeek <= 2.0) return {
				rateLabel: label, quality: 'caution', text: 'Rythme soutenu',
				context: 'Risque de perte musculaire au-delà de 1%/sem'
			};
			return {
				rateLabel: label, quality: 'caution', text: 'Perte rapide',
				context: 'Surveiller la préservation musculaire (protéines ≥ 1,6 g/kg)'
			};
		}

		if (key === 'waistCm') {
			const label    = `${sign}${perMonth.toFixed(1)} cm/mois`;
			const absMonth = Math.abs(perMonth);

			// Contexte IDF (seuils consensus européens)
			let context: string | null;
			if (currentValue >= 94)      context = 'Zone à risque cardiovasculaire élevé (IDF ≥ 94 cm)';
			else if (currentValue >= 80) context = 'Périmètre abdominal élevé (IDF : seuil F ≥ 80 cm)';
			else                         context = 'Périmètre abdominal sain ✓';

			if (Math.abs(delta) < 0.5)  return { rateLabel: label, quality: 'neutral',   text: 'Tour de taille stable',            context };
			if (delta > 0)              return { rateLabel: label, quality: 'caution',   text: 'Légère hausse abdominale',          context };
			if (absMonth >= 2)          return { rateLabel: label, quality: 'excellent', text: 'Réduction abdominale marquée',      context };
			if (absMonth >= 0.5)        return { rateLabel: label, quality: 'good',      text: 'Réduction progressive',             context };
			                             return { rateLabel: label, quality: 'neutral',   text: 'Légère amélioration',               context };
		}

		if (key === 'chestCm') {
			const label = `${sign}${perMonth.toFixed(1)} cm/mois`;
			if (Math.abs(delta) < 0.5) return { rateLabel: label, quality: 'neutral', text: 'Périmètre thoracique stable',    context: null };
			if (delta > 0)              return { rateLabel: label, quality: 'good',    text: 'Volume thoracique en hausse',    context: null };
			                            return { rateLabel: label, quality: 'neutral', text: 'Ajustement thoracique',          context: null };
		}

		// armCm
		const label = `${sign}${perMonth.toFixed(1)} cm/mois`;
		if (Math.abs(delta) < 0.3) return { rateLabel: label, quality: 'neutral',   text: 'Tour de bras stable',  context: null };
		if (delta > 0) return {
			rateLabel: label, quality: 'excellent', text: 'Gain musculaire bras',
			context: delta > 2 ? `+${delta} cm en ${Math.round(days / 7)} semaines` : null
		};
		return { rateLabel: label, quality: 'neutral', text: 'Légère variation', context: null };
	}

	// ── Libellé de période ───────────────────────────────────
	const periodLabel = $derived(
		histSorted.length >= 2
			? new Date(oldestEntry!.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) +
			  ' → ' +
			  new Date(latestEntry!.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
			: null
	);

	// ── Calendrier shadcn ────────────────────────────────────
	/** Convertit une Date JS en CalendarDate (@internationalized/date) */
	function toCalDate(d: Date | string): CalendarDate {
		const date = d instanceof Date ? d : new Date(d);
		return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
	}

	/** Ensemble des clés "YYYY-MM-DD" ayant une mesure dans la période filtrée */
	const measurementDateSet = $derived(
		new Set(filteredMeasurements.map((m) => toCalDate(m.createdAt).toString()))
	);

	/** Seuls les jours avec mesure sont cliquables */
	const isDateUnavailable = $derived(
		(date: DateValue) => !measurementDateSet.has(date.toString())
	);

	/** Date sélectionnée dans le calendrier (par défaut : la dernière mesure) */
	let selectedCalDate = $state<CalendarDate | undefined>(undefined);

	/** Réinitialise la sélection à la mesure la plus récente quand la période change */
	$effect(() => {
		selectedCalDate = latestEntry ? toCalDate(latestEntry.createdAt) : undefined;
	});

	/** Mesure correspondant à la date sélectionnée + sa précédente (pour le delta) */
	const selectedMeasurement = $derived.by(() => {
		if (!selectedCalDate) return undefined;
		const key = selectedCalDate.toString();
		const idx = filteredMeasurements.findIndex(
			(m) => toCalDate(m.createdAt).toString() === key
		);
		if (idx === -1) return undefined;
		return {
			entry:    filteredMeasurements[idx] as MeasurementSafe,
			prev:     filteredMeasurements[idx + 1] as MeasurementSafe | undefined,
			isLatest: idx === 0
		};
	});
</script>

<div class="history-view">

	{#if bodyMeasurements.length === 0}
		<!-- ── État vide ─────────────────────────── -->
		<div class="history-empty">
			<Ruler class="history-empty-icon" />
			<p class="history-empty-title">Aucune mesure enregistrée</p>
			<p class="history-empty-desc">
				Complète ton profil physique pour commencer à suivre ta progression.
			</p>
			<Button type="button" class="mt-4 gap-2" onclick={onswitch}>
				<ArrowRight class="h-4 w-4" />
				Compléter mon profil
			</Button>
		</div>

	{:else}

		<!-- ── Sélecteur de période ───────────────── -->
		<div class="period-header">
			<div class="period-label">
				<CalendarRange class="h-3.5 w-3.5 text-muted-foreground" />
				<span class="period-title">Progression</span>
				<span class="period-count">
					{filteredMeasurements.length} mesure{filteredMeasurements.length > 1 ? 's' : ''}
				</span>
			</div>
			<div class="time-range-tabs" role="group" aria-label="Période d'analyse">
				{#each timeRanges as tab}
					<button
						type="button"
						class="range-tab"
						class:active={timeRange === tab.id}
						onclick={() => { timeRange = tab.id; }}
					>{tab.label}</button>
				{/each}
			</div>
		</div>

		<!-- ── Profil d'évolution détecté ────────────────────── -->
		{#if profilePattern && filteredMeasurements.length >= 2}
			<div class="profile-banner quality-{profilePattern.quality}">
				<div class="profile-icon-wrap">
					{#if profilePattern.type === 'loss'}
						<TrendingDown class="profile-icon" />
					{:else if profilePattern.type === 'gain'}
						<TrendingUp class="profile-icon" />
					{:else if profilePattern.type === 'recomposition'}
						<Repeat2 class="profile-icon" />
					{:else if profilePattern.type === 'maintenance'}
						<Minus class="profile-icon" />
					{:else}
						<Zap class="profile-icon" />
					{/if}
				</div>
				<div class="profile-content">
					<div class="profile-head">
						<span class="profile-title">{profilePattern.title}</span>
						<span class="profile-badge quality-badge-{profilePattern.quality}">
							{#if profilePattern.quality === 'excellent'}Excellent
							{:else if profilePattern.quality === 'good'}Bon
							{:else if profilePattern.quality === 'caution'}Attention
							{:else}Neutre{/if}
						</span>
					</div>
					<p class="profile-desc">{profilePattern.desc}</p>
					<p class="profile-science">{profilePattern.science}</p>
				</div>
			</div>
		{/if}

		<!-- ── Bandeaux de stats enrichis ────────── -->
		<div class="stat-strip">
			{#each metricOptions as m}
				{@const curr  = latestEntry?.[m.key] as number | null | undefined}
				{@const delta = getMetricDelta(m.key)}
				{#if curr != null}
					{@const interp = delta && periodDays > 0
						? interpretMetric(m.key, delta.abs, periodDays, curr)
						: null}
					<div class="stat-card" style="--stat-color: {m.color}">
						<div class="stat-header">
							<span class="stat-dot"></span>
							<span class="stat-label">{m.label}</span>
						</div>
						<span class="stat-value">
							{curr}<span class="stat-unit"> {m.unit}</span>
						</span>
						{#if delta && delta.abs !== 0}
							<span
								class="stat-delta"
								class:stat-delta-good={isGoodDelta(m.key, delta.abs)}
								class:stat-delta-bad={!isGoodDelta(m.key, delta.abs)}
							>
								{delta.abs > 0 ? '+' : ''}{delta.abs} {m.unit}
							</span>
						{/if}
						{#if interp}
							<span class="stat-rate">{interp.rateLabel}</span>
							<span class="stat-interp quality-{interp.quality}">{interp.text}</span>
							{#if interp.context}
								<span class="stat-context">{interp.context}</span>
							{/if}
						{/if}
					</div>
				{/if}
			{/each}
		</div>

		<!-- ── Radar : snapshot début vs actuel ─────── -->
		{#if radarData.length >= 3}
			<div class="dual-row">
				<Card.Root class="radar-card">
					<Card.Header class="pb-1 pt-4 px-4">
						<Card.Title class="text-sm">Snapshot actuel</Card.Title>
						<Card.Description class="text-xs">Début (- - -) vs maintenant (—)</Card.Description>
					</Card.Header>
					<Card.Content class="flex justify-center pb-3 px-3">
						<Chart.Container config={radarConfig} class="mx-auto aspect-square w-full max-h-[220px]">
							<LineChart
								radial
								data={radarData}
								x="metric"
								xScale={scaleBand()}
								padding={14}
								series={[
									{
										key: 'debut',
										label: 'Début',
										color: radarConfig.debut.color,
										props: { class: 'fill-none stroke-[1.5] opacity-40 [stroke-dasharray:4_3]' }
									},
									{
										key: 'actuel',
										label: 'Actuel',
										color: radarConfig.actuel.color,
										props: { class: 'fill-none stroke-[2.5]' }
									}
								]}
								props={{
									spline: { curve: curveLinearClosed, motion: 'tween' },
									grid: { radialY: 'linear', x: false },
									yAxis: { format: () => '' },
									tooltip: { context: { mode: 'voronoi' } }
								}}
							>
								{#snippet tooltip()}
									<Chart.Tooltip indicator="dot" labelFormatter={(v: string) => v} />
								{/snippet}
							</LineChart>
						</Chart.Container>
					</Card.Content>
				</Card.Root>

				<Card.Root class="summary-card">
					<Card.Header class="pb-1 pt-4 px-4">
						<Card.Title class="text-sm">Bilan global</Card.Title>
						<Card.Description class="text-xs">Depuis le début de la période</Card.Description>
					</Card.Header>
					<Card.Content class="px-4 pb-4">
						<ul class="summary-list">
							{#each metricOptions as m}
								{@const delta = getMetricDelta(m.key)}
								{@const curr  = latestEntry?.[m.key] as number | null | undefined}
								{#if delta !== null && curr != null}
									<li class="summary-item" style="--si-color: {m.color}">
										<span class="summary-dot"></span>
										<span class="summary-label">{m.label}</span>
										<span
											class="summary-val"
											class:summary-good={isGoodDelta(m.key, delta.abs)}
											class:summary-bad={!isGoodDelta(m.key, delta.abs) && delta.abs !== 0}
										>
											{delta.abs > 0 ? '+' : ''}{delta.abs} {m.unit}
											<span class="summary-pct">({delta.pct > 0 ? '+' : ''}{delta.pct}%)</span>
										</span>
									</li>
								{/if}
							{/each}
						</ul>
					</Card.Content>
				</Card.Root>
			</div>
		{/if}

		<!-- ── Timeline multi-métriques ──────────── -->
		<Card.Root>
			<Card.Header class="pb-2">
				<div class="chart-title-row">
					<div>
						<Card.Title class="text-base">Évolution corporelle</Card.Title>
						<Card.Description class="text-xs">
							Variation en % par rapport au début de la période
						</Card.Description>
					</div>
					<div class="chart-legend">
						{#each activeMetrics as m}
							<span class="legend-item" style="--legend-color: {m.color}">
								<span class="legend-dot"></span>{m.label}
							</span>
						{/each}
					</div>
				</div>
			</Card.Header>

			<Card.Content class="px-2 pb-0">
				{#if activeMetrics.length >= 1 && normalizedData.length >= 2}
					<Chart.Container config={chartConfig} class="h-[240px] w-full">
						<AreaChart
							data={normalizedData}
							x="date"
							xScale={scaleUtc()}
							yPadding={[10, 15]}
							series={activeMetrics.map((m) => ({
								key:   m.key,
								label: chartConfig[m.key as keyof typeof chartConfig].label,
								color: m.color
							}))}
							props={{
								area: {
									curve: curveNatural,
									'fill-opacity': 0.4,
									line: { class: 'stroke-[2px]' },
									motion: 'tween'
								},
								xAxis: {
									format: (v: Date) => v.toLocaleDateString('fr-FR', { month: 'short' })
								},
								yAxis: {
									format: (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`
								}
							}}
						>
							{#snippet marks({ series, getAreaProps })}
								{#each series as s, i (s.key)}
									<LinearGradient
										stops={[s.color ?? '', `color-mix(in lch, ${s.color} 8%, transparent)`]}
										vertical
									>
										{#snippet children({ gradient })}
											<Area {...getAreaProps(s, i)} fill={gradient} />
										{/snippet}
									</LinearGradient>
								{/each}
							{/snippet}
							{#snippet tooltip()}
								<Chart.Tooltip
									indicator="dot"
									labelFormatter={(v: Date) =>
										new Date(v).toLocaleDateString('fr-FR', {
											day: 'numeric', month: 'long', year: 'numeric'
										})}
								/>
							{/snippet}
						</AreaChart>
					</Chart.Container>
				{:else}
					<div class="chart-no-data">
						<p class="text-sm text-muted-foreground text-center">
							Au moins 2 mesures sont nécessaires pour afficher la timeline.
						</p>
					</div>
				{/if}
			</Card.Content>

			{#if periodLabel}
				<Card.Footer class="pt-3 pb-4">
					<div class="chart-footer">
						<CalendarRange class="h-3.5 w-3.5 text-muted-foreground" />
						<span class="text-xs text-muted-foreground">{periodLabel}</span>
						<span class="chart-count">{filteredMeasurements.length} mesures</span>
					</div>
				</Card.Footer>
			{/if}
		</Card.Root>

		<!-- ── Calendrier shadcn + panel de détail ─── -->
		<div class="cal-wrapper">
			<!-- Calendrier : seuls les jours avec mesure sont cliquables -->
			<!-- {#key} force le remontage (navigation reset) quand la période change -->
			{#key timeRange}
				<Calendar
					type="single"
					bind:value={selectedCalDate}
					isDateUnavailable={isDateUnavailable}
					numberOfMonths={2}
					weekStartsOn={1}
					class="cal-root"
				/>
			{/key}

			<!-- Panel de détail pour la date sélectionnée -->
			{#if selectedMeasurement}
				{@const { entry, prev, isLatest } = selectedMeasurement}
				<div class="cal-detail" role="region" aria-label="Détail de la mesure">
					<div class="cal-detail-header">
						<span class="cal-detail-date">
							{new Date(entry.createdAt).toLocaleDateString('fr-FR', {
								weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
							})}
						</span>
						{#if isLatest}
							<Badge variant="secondary" class="text-xs shrink-0">Dernière</Badge>
						{/if}
					</div>

					<div class="cal-detail-metrics">
						{#each metricOptions as m}
							{@const val   = entry[m.key] as number | null | undefined}
							{@const delta = getDelta(val, prev?.[m.key] as number | null | undefined)}
							{#if val != null}
								<div
									class="cal-detail-card"
									style="--cdc-color: {m.color}"
									aria-label="{m.label} : {val} {m.unit}"
								>
									<div class="cdc-header">
										<span class="cdc-dot"></span>
										<span class="cdc-label">{m.label}</span>
									</div>
									<span class="cdc-val">
										{val}<span class="cdc-unit"> {m.unit}</span>
									</span>
									{#if delta !== null && delta !== 0}
										<span
											class="cdc-delta"
											class:cdc-good={isGoodDelta(m.key, delta)}
											class:cdc-bad={!isGoodDelta(m.key, delta)}
											aria-label="variation de {delta > 0 ? '+' : ''}{delta} {m.unit} par rapport à la mesure précédente"
										>
											{delta > 0 ? '↑' : '↓'} {Math.abs(delta)} {m.unit}
										</span>
									{:else}
										<span class="cdc-delta cdc-stable">— stable</span>
									{/if}
								</div>
							{/if}
						{/each}
					</div>
				</div>
			{/if}
		</div>

	{/if}
</div>

<style lang="scss">
	.history-view {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* ── État vide ────────────────────────────── */
	.history-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1.5rem;
		text-align: center;
		gap: 0.5rem;
	}

	:global(.history-empty-icon) {
		width: 2.5rem;
		height: 2.5rem;
		color: var(--muted-foreground);
		opacity: 0.5;
		margin-bottom: 0.5rem;
	}

	.history-empty-title { font-size: 1rem; font-weight: 600; }
	.history-empty-desc  { font-size: 0.875rem; color: var(--muted-foreground); max-width: 280px; }

	/* ── Period header ───────────────────────── */
	.period-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.period-label {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.period-title {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--foreground);
	}

	.period-count {
		font-size: 0.7rem;
		color: var(--muted-foreground);
		background: var(--muted);
		padding: 0.1rem 0.45rem;
		border-radius: 9999px;
	}

	/* ── Time range tabs ─────────────────────── */
	.time-range-tabs {
		display: flex;
		border: 1px solid var(--border);
		border-radius: 8px;
		overflow: hidden;
	}

	.range-tab {
		padding: 0.25rem 0.65rem;
		font-size: 0.73rem;
		font-weight: 500;
		background: transparent;
		border: none;
		cursor: pointer;
		color: var(--muted-foreground);
		transition: background 0.15s, color 0.15s;
		line-height: 1.4;

		&.active {
			background: var(--primary);
			color: var(--primary-foreground);
		}

		&:not(.active):hover {
			background: var(--muted);
			color: var(--foreground);
		}
	}

	/* ── Profil d'évolution banner ───────────── */
	.profile-banner {
		display: flex;
		gap: 0.875rem;
		padding: 0.875rem 1rem;
		border-radius: 12px;
		border: 1px solid var(--border);
		background: var(--card);
		border-left: 4px solid var(--pb-accent);
		align-items: flex-start;

		/* couleurs par qualité */
		&.quality-excellent {
			--pb-accent: oklch(0.55 0.2 145);
			--pb-icon:   oklch(0.52 0.2 145);
			background: color-mix(in oklch, oklch(0.65 0.18 145) 6%, var(--card));
		}
		&.quality-good {
			--pb-accent: oklch(0.52 0.16 220);
			--pb-icon:   oklch(0.48 0.14 220);
			background: color-mix(in oklch, oklch(0.6 0.14 220) 6%, var(--card));
		}
		&.quality-neutral {
			--pb-accent: var(--border);
			--pb-icon:   var(--muted-foreground);
			background: var(--card);
		}
		&.quality-caution {
			--pb-accent: oklch(0.6 0.17 70);
			--pb-icon:   oklch(0.42 0.16 70);
			background: color-mix(in oklch, oklch(0.7 0.15 70) 6%, var(--card));
		}
	}

	.profile-icon-wrap {
		flex-shrink: 0;
		margin-top: 0.1rem;
	}

	:global(.profile-icon) {
		width: 1.2rem;
		height: 1.2rem;
		color: var(--pb-icon);
	}

	.profile-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}

	.profile-head {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.profile-title {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--foreground);
	}

	.profile-badge {
		font-size: 0.62rem;
		font-weight: 600;
		padding: 0.1rem 0.4rem;
		border-radius: 4px;
		white-space: nowrap;

		&.quality-badge-excellent {
			background: color-mix(in oklch, oklch(0.65 0.2 145) 18%, transparent);
			color: oklch(0.38 0.18 145);
		}
		&.quality-badge-good {
			background: color-mix(in oklch, oklch(0.6 0.15 220) 18%, transparent);
			color: oklch(0.38 0.14 220);
		}
		&.quality-badge-neutral {
			background: var(--muted);
			color: var(--muted-foreground);
		}
		&.quality-badge-caution {
			background: color-mix(in oklch, oklch(0.7 0.17 70) 18%, transparent);
			color: oklch(0.42 0.16 70);
		}
	}

	.profile-desc {
		font-size: 0.78rem;
		color: var(--foreground);
		margin: 0;
		line-height: 1.4;
	}

	.profile-science {
		font-size: 0.7rem;
		color: var(--muted-foreground);
		margin: 0;
		line-height: 1.45;
		font-style: italic;
	}

	/* ── Stat strip ───────────────────────────── */
	.stat-strip {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.5rem;
	}

	@media (min-width: 420px) {
		.stat-strip { grid-template-columns: repeat(4, 1fr); }
	}

	.stat-card {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.625rem 0.75rem;
		border: 1px solid var(--border);
		border-radius: 10px;
		background: var(--card);
		border-top: 3px solid var(--stat-color);
	}

	.stat-header {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.stat-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: var(--stat-color);
		flex-shrink: 0;
	}

	.stat-label {
		font-size: 0.7rem;
		color: var(--muted-foreground);
		font-weight: 500;
		line-height: 1.2;
	}

	.stat-value {
		font-size: 1.05rem;
		font-weight: 700;
		line-height: 1.1;
		color: var(--foreground);
	}

	.stat-unit {
		font-size: 0.7rem;
		font-weight: 400;
		color: var(--muted-foreground);
	}

	.stat-delta {
		display: inline-flex;
		align-items: center;
		font-size: 0.68rem;
		font-weight: 600;
		padding: 0.1rem 0.35rem;
		border-radius: 4px;
		width: fit-content;
		background: var(--muted);
		color: var(--muted-foreground);
	}

	.stat-delta-good {
		background: color-mix(in oklch, oklch(0.65 0.2 145) 15%, transparent);
		color: oklch(0.42 0.18 145);
	}

	.stat-delta-bad {
		background: color-mix(in oklch, oklch(0.55 0.22 25) 15%, transparent);
		color: oklch(0.42 0.22 25);
	}

	.stat-rate {
		font-size: 0.63rem;
		color: var(--muted-foreground);
		font-weight: 400;
		margin-top: 0.1rem;
	}

	.stat-interp {
		font-size: 0.63rem;
		font-weight: 600;
		padding: 0.1rem 0.35rem;
		border-radius: 4px;
		width: fit-content;
		line-height: 1.4;

		&.quality-excellent {
			background: color-mix(in oklch, oklch(0.65 0.2 145) 15%, transparent);
			color: oklch(0.42 0.18 145);
		}
		&.quality-good {
			background: color-mix(in oklch, oklch(0.6 0.15 220) 18%, transparent);
			color: oklch(0.38 0.14 220);
		}
		&.quality-neutral {
			background: var(--muted);
			color: var(--muted-foreground);
		}
		&.quality-caution {
			background: color-mix(in oklch, oklch(0.7 0.17 70) 18%, transparent);
			color: oklch(0.42 0.16 70);
		}
	}

	.stat-context {
		font-size: 0.6rem;
		color: var(--muted-foreground);
		font-weight: 400;
		line-height: 1.35;
		opacity: 0.85;
	}

	/* ── Dual-row layout (radar + bilan) ─────── */
	.dual-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		align-items: start;
	}

	@media (max-width: 400px) {
		.dual-row { grid-template-columns: 1fr; }
	}

	/* ── Bilan summary card ───────────────────── */
	.summary-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.summary-item {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.summary-dot {
		width: 0.45rem;
		height: 0.45rem;
		border-radius: 50%;
		background: var(--si-color);
		flex-shrink: 0;
	}

	.summary-label {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		flex: 1;
		min-width: 0;
	}

	.summary-val {
		font-size: 0.78rem;
		font-weight: 700;
		white-space: nowrap;
	}

	.summary-pct {
		font-size: 0.68rem;
		font-weight: 400;
		opacity: 0.7;
	}

	.summary-good { color: oklch(0.42 0.18 145); }
	.summary-bad  { color: oklch(0.42 0.22 25);  }

	/* ── Chart header ─────────────────────────── */
	.chart-title-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.chart-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	.legend-item {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.72rem;
		color: var(--muted-foreground);
	}

	.legend-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 2px;
		background: var(--legend-color);
		flex-shrink: 0;
	}

	.chart-no-data {
		height: 120px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	/* ── Chart footer ─────────────────────────── */
	.chart-footer {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
	}

	.chart-count {
		margin-left: auto;
		font-size: 0.72rem;
		color: var(--muted-foreground);
		background: var(--muted);
		padding: 0.1rem 0.5rem;
		border-radius: 9999px;
	}

	/* ── Calendrier shadcn ───────────────────── */
	.cal-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	/* Force le calendrier à prendre toute la largeur disponible */
	:global(.cal-root) {
		width: 100% !important;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--card);
	}

	/*
	 * Indicateur visuel sur les jours ayant une mesure :
	 * bits-ui marque les jours "available" (non-unavailable) avec data-available
	 * et les selected avec data-selected — on ajoute un point de couleur primaire
	 * sous le numéro du jour pour les jours de mesure disponibles.
	 */
	:global(.cal-root [data-bits-calendar-cell-trigger]:not([data-unavailable])::after) {
		content: '';
		display: block;
		width: 0.3rem;
		height: 0.3rem;
		border-radius: 50%;
		background: var(--primary);
		margin: 0.1rem auto 0;
	}
	:global(.cal-root [data-bits-calendar-cell-trigger][data-selected]::after) {
		background: var(--primary-foreground);
	}
	:global(.cal-root [data-bits-calendar-cell-trigger][data-unavailable]) {
		opacity: 0.3;
		cursor: default;
		pointer-events: none;
	}

	/* ── Panel de détail ─────────────────────── */
	.cal-detail {
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--card);
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
		animation: fadeIn 0.18s ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(4px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	.cal-detail-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.cal-detail-date {
		font-size: 0.85rem;
		font-weight: 700;
		text-transform: capitalize;
		color: var(--foreground);
	}

	/* Grille 2 cols (mobile) → 4 cols (≥420px) */
	.cal-detail-metrics {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.5rem;

		@media (min-width: 420px) {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	.cal-detail-card {
		display: flex;
		flex-direction: column;
		gap: 0.18rem;
		padding: 0.55rem 0.7rem 0.5rem;
		border: 1px solid var(--border);
		border-radius: 10px;
		background: var(--muted);
		border-top: 3px solid var(--cdc-color);
	}

	.cdc-header {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.cdc-dot {
		width: 0.4rem;
		height: 0.4rem;
		border-radius: 50%;
		background: var(--cdc-color);
		flex-shrink: 0;
	}

	.cdc-label {
		font-size: 0.65rem;
		color: var(--muted-foreground);
		font-weight: 500;
	}

	.cdc-val {
		font-size: 1rem;
		font-weight: 800;
		color: var(--foreground);
		line-height: 1.2;
		letter-spacing: -0.01em;
	}

	.cdc-unit {
		font-size: 0.65rem;
		font-weight: 400;
		color: var(--muted-foreground);
	}

	.cdc-delta {
		font-size: 0.65rem;
		font-weight: 600;
		padding: 0.1rem 0.3rem;
		border-radius: 4px;
		width: fit-content;
		background: var(--muted);
		color: var(--muted-foreground);

		&.cdc-good {
			background: color-mix(in oklch, oklch(0.65 0.2 145) 16%, transparent);
			color: oklch(0.42 0.18 145);
		}

		&.cdc-bad {
			background: color-mix(in oklch, oklch(0.55 0.22 25) 14%, transparent);
			color: oklch(0.44 0.22 25);
		}

		&.cdc-stable {
			opacity: 0.5;
		}
	}
</style>
