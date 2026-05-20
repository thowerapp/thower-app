<script lang="ts">
	import type { PageData } from './$types';

	type DayMealRow = PageData['meals'][number];
	let { data }: { data: PageData } = $props();

	let mealMult = $state<Record<string, number>>({});
	$effect.pre(() => {
		const next: Record<string, number> = {};
		for (const m of data.meals) next[m.id] = 1;
		mealMult = next;
	});

	function multOf(id: string) { return mealMult[id] ?? 1; }
	function setMult(id: string, v: number) {
		const clamped = Math.min(9, Math.max(0.5, Math.round(v * 10) / 10));
		mealMult = { ...mealMult, [id]: clamped };
	}
	function setMultRaw(id: string, raw: string) {
		const n = parseFloat(raw.replace(',', '.'));
		if (Number.isFinite(n)) setMult(id, n);
	}

	function macrosScaled(m: DayMealRow, u: number) {
		return {
			kcal: Math.round(m.calories * u),
			p:   Math.round(m.proteinG * u * 10) / 10,
			c:   Math.round(m.carbsG   * u * 10) / 10,
			f:   Math.round(m.fatG     * u * 10) / 10,
			fib: Math.round(m.fiberG   * u * 10) / 10
		};
	}

	function fmtG(g: number) {
		if (!Number.isFinite(g)) return '—';
		const r = Math.round(g * 10) / 10;
		return r % 1 === 0 ? String(Math.round(r)) : String(r);
	}

	const fastingActive = $derived(
		(data as { intermittentFasting?: boolean }).intermittentFasting === true
	);

	const displayMeals = $derived.by(() => {
		if (!fastingActive) return data.meals;
		const noBreakfast = data.meals.filter((m) => m.position !== 'BREAKFAST');
		if (noBreakfast.length === 0) return [];
		const total = data.meals.reduce(
			(acc, m) => ({
				calories: acc.calories + m.calories,
				proteinG: acc.proteinG + m.proteinG,
				carbsG:   acc.carbsG   + m.carbsG,
				fatG:     acc.fatG     + m.fatG,
				fiberG:   acc.fiberG   + m.fiberG
			}),
			{ calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 }
		);
		const count = noBreakfast.length;
		const tKcal = data.targetKcal ?? total.calories;
		const tProt = data.targetProteinG ?? total.proteinG;
		const tFib  = data.targetFiberG   ?? total.fiberG;
		return noBreakfast.map((m, i) => ({
			...m,
			slotIndex: i + 1,
			label: i === 0 ? 'Repas 1 — Déjeuner' : 'Repas 2 — Dîner',
			calories:  Math.round(tKcal / count),
			proteinG:  Math.round((tProt / count) * 10) / 10,
			carbsG:    Math.round((total.carbsG / count) * 10) / 10,
			fatG:      Math.round((total.fatG   / count) * 10) / 10,
			fiberG:    Math.round((tFib  / count) * 10) / 10
		}));
	});

	// Onglet actif — initialisé depuis le hash URL
	let activeTab = $state('');
	$effect(() => {
		const positions = displayMeals.map((m) => m.position.toLowerCase());
		const hash = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
		if (hash && positions.includes(hash)) {
			activeTab = hash;
		} else if (positions.length > 0 && !positions.includes(activeTab)) {
			activeTab = positions[0];
		}
	});

	const activeMeal = $derived(
		displayMeals.find((m) => m.position.toLowerCase() === activeTab) ?? displayMeals[0] ?? null
	);

	function tabLabel(pos: string): string {
		if (pos === 'BREAKFAST') return 'Petit-déj.';
		if (pos === 'LUNCH')     return 'Déjeuner';
		if (pos === 'DINNER')    return 'Dîner';
		return pos;
	}

	const titleDay = $derived(
		data.dayName.charAt(0).toUpperCase() + data.dayName.slice(1) + ' · Jour ' + data.dayIndex
	);
</script>

<div class="u-back-row">
	<a href="/user/nutrition/cadencier?semaine={data.weekNum}" class="u-back-lnk">
		<svg width="12" height="12" viewBox="0 0 14 14"><path d="M9 2L4 7l5 5" stroke="var(--txd)" stroke-width="1.5" stroke-linecap="round"/></svg>
		<span class="u-back-lbl">Cadencier</span>
	</a>
	<div class="u-back-head">{titleDay}</div>
</div>

<!-- Onglets repas -->
{#if data.hasPlan && displayMeals.length > 0}
	<div class="meal-tabs">
		{#each displayMeals as meal}
			<button
				type="button"
				class="meal-tab"
				class:active={activeTab === meal.position.toLowerCase()}
				onclick={() => activeTab = meal.position.toLowerCase()}
			>
				{tabLabel(meal.position)}
			</button>
		{/each}
	</div>
{/if}

{#if !data.hasPlan}
	<div class="empty-state">
		<p>Pas encore de journée nutrition pour le jour {data.dayIndex}.</p>
		<p class="muted">Elle apparaîtra après génération du planning nutrition.</p>
	</div>
{:else if activeMeal}
	{@const u = multOf(activeMeal.id)}
	{@const ms = macrosScaled(activeMeal, u)}

	<div class="meal-section">
		<div class="meal-header">
			<span class="meal-slot">{activeMeal.label}</span>
			<span class="meal-clock">{activeMeal.timeLabel}</span>
		</div>

		<h2 class="recipe-name">{activeMeal.recipeName}</h2>

		{#if activeMeal.isManual}
			<p class="badge-manual">Saisie manuelle</p>
		{/if}

		{#if activeMeal.description}
			<p class="desc">{activeMeal.description}</p>
		{/if}

		{#if activeMeal.totalTimeMin != null || (activeMeal.quantityG != null && activeMeal.quantityG > 0)}
			<div class="meta-row">
				{#if activeMeal.totalTimeMin != null}
					<span>⏱ {activeMeal.totalTimeMin} min</span>
				{/if}
				{#if activeMeal.quantityG != null && activeMeal.quantityG > 0}
					<span>{fmtG(activeMeal.quantityG)} g planifiés</span>
				{/if}
			</div>
		{/if}

		{#if activeMeal.allergens.length > 0}
			<p class="allergens">Allergènes : {activeMeal.allergens.join(', ')}</p>
		{/if}

		<!-- Macros -->
		<div class="macros">
			<div class="macro"><div class="mac-val">{ms.kcal}</div><div class="mac-lbl">kcal</div></div>
			<div class="macro"><div class="mac-val">{ms.p}g</div><div class="mac-lbl">Prot.</div></div>
			<div class="macro"><div class="mac-val">{ms.c}g</div><div class="mac-lbl">Gluc.</div></div>
			<div class="macro"><div class="mac-val">{ms.f}g</div><div class="mac-lbl">Lip.</div></div>
			<div class="macro"><div class="mac-val">{ms.fib}g</div><div class="mac-lbl">Fib.</div></div>
		</div>

		<!-- Portions -->
		<div class="portions-row">
			<span class="portions-lbl">Portions</span>
			<div class="qty-control">
				<button type="button" onclick={() => setMult(activeMeal.id, u - 0.1)} disabled={u <= 0.5}>−</button>
				<input
					type="number" min="0.5" max="9" step="0.1"
					value={u}
					oninput={(e) => setMultRaw(activeMeal.id, e.currentTarget.value)}
					class="mult-input"
				/>
				<button type="button" onclick={() => setMult(activeMeal.id, u + 0.1)} disabled={u >= 9}>+</button>
			</div>
		</div>

		<!-- Ingrédients -->
		{#if activeMeal.ingredients.length > 0}
			<h3 class="subh">Ingrédients</h3>
			<ul class="ing-list">
				{#each activeMeal.ingredients as ing}
					<li>
						<span class="ing-name">{ing.name}</span>
						{#if ing.scaledG != null}
							<span class="ing-qty">{fmtG(ing.scaledG * u)} g{#if ing.unit && ing.unit !== 'g'} ({ing.unit}){/if}</span>
						{:else}
							<span class="ing-qty muted">au goût</span>
						{/if}
						{#if ing.isOptional}<span class="opt">facultatif</span>{/if}
						{#if ing.note}<div class="ing-note">{ing.note}</div>{/if}
					</li>
				{/each}
			</ul>
		{/if}

		<!-- Préparation -->
		{#if activeMeal.instructions}
			<h3 class="subh">Préparation</h3>
			<pre class="instructions">{activeMeal.instructions}</pre>
		{/if}

		<a class="edit-link" href="/user/nutrition/cadencier/{data.dayIndex}/edit-meal/{activeMeal.position.toLowerCase()}">
			Modifier ce repas →
		</a>
	</div>
{/if}

<style>
	/* Onglets */
	.meal-tabs {
		display: flex;
		border-bottom: 1px solid var(--br);
	}
	.meal-tab {
		flex: 1;
		padding: 13px 8px;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		font-size: .625rem;
		font-weight: 600;
		color: var(--txd);
		font-family: var(--fb);
		letter-spacing: .06em;
		text-transform: uppercase;
		cursor: pointer;
		transition: color .15s, border-color .15s;
		-webkit-tap-highlight-color: transparent;
	}
	.meal-tab.active {
		color: var(--g);
		border-bottom-color: var(--g);
	}

	/* Contenu repas */
	.meal-section { padding: 20px 18px 48px; }

	.meal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 10px;
	}
	.meal-slot {
		font-size: .625rem;
		font-weight: 600;
		color: var(--txd);
		text-transform: uppercase;
		letter-spacing: .06em;
		font-family: var(--fb);
	}
	.meal-clock { font-size: .625rem; color: var(--txd); font-family: var(--fb); }

	.recipe-name {
		margin: 0 0 16px;
		font-size: 1.375rem;
		font-weight: 700;
		color: var(--g);
		line-height: 1.15;
		font-family: var(--fh);
		letter-spacing: -.03em;
	}

	.badge-manual { font-size: .5625rem; color: var(--txd); margin: 0 0 10px; font-family: var(--fb); }

	.desc { font-size: .6875rem; color: var(--txd); line-height: 1.55; margin: 0 0 14px; }

	.meta-row {
		display: flex;
		gap: 16px;
		font-size: .625rem;
		color: var(--txd);
		margin-bottom: 12px;
		font-family: var(--fb);
	}

	.allergens { font-size: .5625rem; color: var(--g); margin: 0 0 12px; font-family: var(--fb); }

	/* Macros — 5 colonnes */
	.macros {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 6px;
		margin-bottom: 0;
	}
	.macro {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 5px;
		padding: 12px 4px;
		border: 1px solid var(--br2);
	}
	.mac-val {
		font-size: 1rem;
		font-weight: 700;
		color: var(--cy);
		font-family: var(--fh);
		line-height: 1;
	}
	.mac-lbl {
		font-size: .5rem;
		color: var(--txd);
		text-transform: uppercase;
		letter-spacing: .04em;
		font-family: var(--fb);
	}

	/* Portions */
	.portions-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 0;
		border-top: 1px solid var(--br);
		border-bottom: 1px solid var(--br);
		margin: 16px 0 24px;
	}
	.portions-lbl { font-size: .6875rem; color: var(--txd); font-family: var(--fb); font-weight: 500; }
	.qty-control { display: flex; align-items: center; gap: 14px; }
	.qty-control button {
		width: 38px; height: 38px;
		border: 1px solid var(--br2);
		background: transparent;
		color: var(--tx);
		cursor: pointer;
		font-size: .875rem;
		font-weight: 600;
		font-family: inherit;
		transition: border-color .15s;
		-webkit-tap-highlight-color: transparent;
	}
	.qty-control button:active { border-color: var(--cy); color: var(--cy); }
	.qty-control button:disabled { opacity: .3; cursor: not-allowed; }
	.mult-input {
		width: 52px;
		text-align: center;
		background: transparent;
		border: 1px solid var(--br2);
		color: var(--tx);
		font-size: .875rem;
		font-weight: 600;
		font-family: var(--fh);
		padding: 6px 2px;
		-moz-appearance: textfield;
		appearance: textfield;
	}
	.mult-input::-webkit-outer-spin-button,
	.mult-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

	/* Ingrédients */
	.subh {
		margin: 0 0 12px;
		font-size: .6875rem;
		font-weight: 600;
		color: var(--tx);
		text-transform: uppercase;
		letter-spacing: .05em;
		font-family: var(--fb);
	}
	.ing-list {
		margin: 0 0 24px;
		padding: 0;
		list-style: none;
	}
	.ing-list li {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 8px;
		padding: 11px 0;
		border-bottom: 1px solid var(--br);
	}
	.ing-list li:first-child { border-top: 1px solid var(--br); }
	.ing-name { font-size: .8125rem; font-weight: 500; color: var(--tx); flex: 1; }
	.ing-qty  { font-size: .8125rem; color: var(--g); font-weight: 600; }
	.opt { font-size: .5rem; color: var(--txd); text-transform: uppercase; font-family: var(--fb); }
	.ing-note { width: 100%; font-size: .5625rem; color: var(--txd); }
	.muted { color: var(--txd); }

	/* Préparation */
	.instructions {
		margin: 0 0 24px;
		padding: 16px;
		font-size: .6875rem;
		line-height: 1.65;
		color: var(--tx);
		background: var(--s2);
		border: 1px solid var(--br);
		white-space: pre-wrap;
		font-family: inherit;
	}

	/* Lien modifier */
	.edit-link {
		display: inline-block;
		margin-top: 8px;
		font-size: .5625rem;
		font-weight: 600;
		color: var(--cy);
		text-decoration: none;
		text-transform: uppercase;
		letter-spacing: .05em;
		font-family: var(--fb);
	}

	/* Empty */
	.empty-state {
		padding: 48px 18px;
		text-align: center;
		font-size: .8125rem;
		color: var(--tx);
	}
	.empty-state .muted { display: block; margin-top: 10px; font-size: .6875rem; }
</style>
