<script lang="ts">
	import type { PageData } from './$types';

	type DayMealRow = PageData['meals'][number];

	let { data }: { data: PageData } = $props();

	/** Multiplicateur affichage (1 = quantités du planning Thower) */
	let mealMult = $state<Record<string, number>>({});

	$effect.pre(() => {
		const next: Record<string, number> = {};
		for (const m of data.meals) next[m.id] = 1;
		mealMult = next;
	});

	function multOf(mealId: string): number {
		return mealMult[mealId] ?? 1;
	}

	function setMult(mealId: string, value: number) {
		const v = Math.min(9, Math.max(0.5, Math.round(value * 10) / 10));
		mealMult = { ...mealMult, [mealId]: v };
	}

	function setMultRaw(mealId: string, raw: string) {
		const parsed = parseFloat(raw.replace(',', '.'));
		if (!Number.isFinite(parsed)) return;
		const v = Math.min(9, Math.max(0.5, Math.round(parsed * 10) / 10));
		mealMult = { ...mealMult, [mealId]: v };
	}

	function macrosScaled(
		m: DayMealRow,
		mult: number
	): { kcal: number; p: number; c: number; f: number; fib: number } {
		return {
			kcal: Math.round(m.calories * mult),
			p: Math.round(m.proteinG * mult * 10) / 10,
			c: Math.round(m.carbsG * mult * 10) / 10,
			f: Math.round(m.fatG * mult * 10) / 10,
			fib: Math.round(m.fiberG * mult * 10) / 10
		};
	}

	const dayTotalsLive = $derived.by(() => {
		let kcal = 0;
		let p = 0;
		let c = 0;
		let f = 0;
		let fib = 0;
		for (const m of data.meals) {
			const u = multOf(m.id);
			kcal += m.calories * u;
			p += m.proteinG * u;
			c += m.carbsG * u;
			f += m.fatG * u;
			fib += m.fiberG * u;
		}
		return {
			kcal: Math.round(kcal),
			p: Math.round(p * 10) / 10,
			c: Math.round(c * 10) / 10,
			f: Math.round(f * 10) / 10,
			fib: Math.round(fib * 10) / 10
		};
	});

	function fmtG(g: number): string {
		if (!Number.isFinite(g)) return '—';
		const r = Math.round(g * 10) / 10;
		return r % 1 === 0 ? String(Math.round(r)) : String(r);
	}

	const titleDay = $derived(
		data.dayName.charAt(0).toUpperCase() +
			data.dayName.slice(1) +
			' · Jour ' +
			data.dayIndex
	);

	const fastingActive = $derived((data as { intermittentFasting?: boolean }).intermittentFasting === true);

	const displayMeals = $derived.by(() => {
		if (!fastingActive) return data.meals;
		return data.meals.filter((m) => m.position !== 'BREAKFAST');
	});
</script>

<div class="back-row">
	<a href="/user/nutrition/cadencier?semaine={data.weekNum}" class="home-btn">← Cadencier</a>
	<div class="page-title">{titleDay}</div>
</div>

<div class="section-head">
	<div class="title">Plan du jour</div>
	<div class="sub">
		Repas et quantités issues du planning (échelle recette : quantité planifiée ÷ rendement de fiche). Tu peux
		ajuster un multiplicateur pour simuler plus / moins de portions en cuisine.
	</div>
</div>

{#if data.targetKcal != null || data.targetProteinG != null}
	<div class="targets-card">
		<div class="targets-title">Objectifs journaliers (formule Thower)</div>
		<ul class="targets-list">
			{#if data.targetKcal != null}
				<li>
					<strong>{data.targetKcal}</strong> kcal / j
					<span class="muted">(TDEE − déficit étalé sur 91 j)</span>
				</li>
			{/if}
			{#if data.breadKcal != null && data.breadKcal > 0}
				<li>
					Pain estimé : <strong>−{data.breadKcal}</strong> kcal → budget repas
					<strong>{data.mealBudgetKcal ?? '—'}</strong> kcal
				</li>
			{:else if data.mealBudgetKcal != null}
				<li>Budget repas (hors pain) : <strong>{data.mealBudgetKcal}</strong> kcal</li>
			{/if}
			{#if data.targetProteinG != null}
				<li>
					Protéines cible : <strong>{data.targetProteinG}</strong> g / j
					<span class="muted">(masse maigre × 1,8)</span>
				</li>
			{/if}
			{#if data.targetFiberG != null}
				<li>
					Fibres mini : <strong>{data.targetFiberG}</strong> g
					<span class="muted">(15 g / 1000 kcal)</span>
				</li>
			{/if}
			{#if data.dailyWaterL != null}
				<li>
					Eau mini : <strong>{data.dailyWaterL}</strong> L
					<span class="muted"
						>({data.workoutDay ? 'jour avec séance' : 'sans séance'})</span
					>
				</li>
			{/if}
		</ul>
	</div>
{:else if !data.hasProfileForTargets}
	<div class="warn-banner">
		Ajoute une <strong>mensuration poids</strong> et des données profil (% masse grasse, activité, objectif perte)
		pour afficher les objectifs kcal / protéines.
	</div>
{/if}

{#if !data.hasPlan}
	<div class="empty-state">
		<p>Pas encore de journée nutrition pour le jour {data.dayIndex}.</p>
		<p class="muted">Elle apparaîtra après génération du planning nutrition.</p>
	</div>
{:else}
	{#each displayMeals as meal (meal.id)}
		{@const u = multOf(meal.id)}
		{@const ms = macrosScaled(meal, u)}
		<section class="meal-section">
			<div class="meal-header">
				<span class="meal-label">{meal.label}</span>
				<span class="meal-time">{meal.timeLabel}</span>
			</div>

			<div class="recipe-title-row">
				<h2 class="recipe-name">{meal.recipeName}</h2>
				<a
					class="edit-link"
					href="/user/nutrition/cadencier/{data.dayIndex}/edit-meal/{meal.slotIndex}"
				>
					Modifier →
				</a>
			</div>

			{#if meal.isManual}
				<p class="badge-manual">Saisie manuelle (partenaire / plat externe)</p>
			{/if}

			{#if meal.description}
				<p class="desc">{meal.description}</p>
			{/if}

			<div class="meta-row">
				{#if meal.totalTimeMin != null}
					<span>⏱ ~{meal.totalTimeMin} min</span>
				{/if}
				{#if meal.quantityG != null && meal.quantityG > 0}
					<span>Plat planifié : <strong>{fmtG(meal.quantityG)}</strong> g</span>
				{/if}
				{#if meal.servings > 1}
					<span>Fiche : {meal.servings} portion(s) de référence</span>
				{/if}
			</div>

			{#if meal.allergens.length > 0}
				<p class="allergens">Allergènes déclarés (recette) : {meal.allergens.join(', ')}</p>
			{/if}

			<div class="macros">
				<div class="macro">
					<div class="value">{ms.kcal}</div>
					<div class="lbl">kcal</div>
				</div>
				<div class="macro">
					<div class="value">{ms.p}g</div>
					<div class="lbl">Prot.</div>
				</div>
				<div class="macro">
					<div class="value">{ms.c}g</div>
					<div class="lbl">Gluc.</div>
				</div>
				<div class="macro">
					<div class="value">{ms.f}g</div>
					<div class="lbl">Lip.</div>
				</div>
				<div class="macro">
					<div class="value">{ms.fib}g</div>
					<div class="lbl">Fib.</div>
				</div>
			</div>

			<div class="portions">
				<span>Coefficient familial</span>
				<div class="qty-control">
					<button type="button" onclick={() => setMult(meal.id, u - 0.1)} disabled={u <= 0.5}>−</button>
					<input
						type="number"
						min="0.5"
						max="9"
						step="0.1"
						value={u}
						oninput={(e) => setMultRaw(meal.id, e.currentTarget.value)}
						class="mult-input"
					/>
					<button type="button" onclick={() => setMult(meal.id, u + 0.1)} disabled={u >= 9}>+</button>
				</div>
			</div>

			{#if meal.ingredients.length > 0}
				<h3 class="subh">Ingrédients (pour ce repas)</h3>
				<ul class="ing-list">
					{#each meal.ingredients as ing}
						<li>
							<span class="ing-name">{ing.name}</span>
							{#if ing.scaledG != null}
								<span class="ing-qty"
									>{fmtG(ing.scaledG * u)} g{#if ing.unit && ing.unit !== 'g'} ({ing.unit}){/if}</span
								>
							{:else}
								<span class="ing-qty muted">quantité au goût / non pesée</span>
							{/if}
							{#if ing.isOptional}
								<span class="opt">facultatif</span>
							{/if}
							{#if ing.note}
								<div class="ing-note">{ing.note}</div>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}

			{#if meal.instructions}
				<h3 class="subh">Préparation</h3>
				<pre class="instructions">{meal.instructions}</pre>
			{/if}
		</section>
	{/each}

	<div class="total-section">
		<div class="total-title">Total du jour (avec multiplicateurs)</div>
		<div class="macros">
			<div class="macro">
				<div class="value">{dayTotalsLive.kcal}</div>
				<div class="lbl">kcal</div>
			</div>
			<div class="macro">
				<div class="value">{dayTotalsLive.p}g</div>
				<div class="lbl">Prot.</div>
			</div>
			<div class="macro">
				<div class="value">{dayTotalsLive.c}g</div>
				<div class="lbl">Gluc.</div>
			</div>
			<div class="macro">
				<div class="value">{dayTotalsLive.f}g</div>
				<div class="lbl">Lip.</div>
			</div>
			<div class="macro">
				<div class="value">{dayTotalsLive.fib}g</div>
				<div class="lbl">Fib.</div>
			</div>
		</div>
		{#if data.dayTotals.calories !== dayTotalsLive.kcal}
			<p class="muted small">
				Sans multiplicateur : {data.dayTotals.calories} kcal · P {data.dayTotals.proteinG} g · C
				{data.dayTotals.carbsG} g · L {data.dayTotals.fatG} g · F {data.dayTotals.fiberG} g
			</p>
		{/if}
	</div>
{/if}

<style>
	.back-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 18px;
		background: transparent;
		flex-shrink: 0;
		gap: 12px;
		border-bottom: 1px solid var(--br);
	}

	.home-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		text-decoration: none;
		color: var(--txd);
		font-size: 0.7rem;
		font-weight: 500;
		padding: 6px 10px;
		border-radius: 3px;
		background: transparent;
		transition: color 0.15s;
	}

	.home-btn:active {
		color: var(--tx);
	}

	.page-title {
		font-size: 0.72rem;
		font-weight: 800;
		color: var(--tx);
		margin-left: auto;
		font-family: var(--fh), sans-serif;
		text-transform: uppercase;
		letter-spacing: -0.06em;
		text-align: right;
		line-height: 1.2;
		max-width: 62%;
	}

	.section-head {
		padding: 14px 18px;
		background: transparent;
		border-bottom: 1px solid var(--br);
	}

	.title {
		font-size: 0.7rem;
		font-weight: 800;
		color: var(--tx);
		font-family: var(--fh), sans-serif;
		text-transform: uppercase;
		letter-spacing: -0.05em;
	}

	.sub {
		font-size: 0.55rem;
		color: var(--txd);
		margin-top: 6px;
		line-height: 1.45;
	}

	.targets-card {
		margin: 12px 18px;
		padding: 12px 14px;
		background: transparent;
		border: 1px solid var(--br2);
		border-left: 2px solid var(--cy);
		border-radius: 6px;
	}

	.targets-title {
		font-size: 0.62rem;
		font-weight: 600;
		color: var(--cy);
		margin-bottom: 8px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.targets-list {
		margin: 0;
		padding-left: 1.1rem;
		font-size: 0.58rem;
		color: var(--tx);
		line-height: 1.55;
	}

	.targets-list li {
		margin-bottom: 4px;
	}

	.muted {
		color: var(--txd);
		font-weight: 400;
	}

	.warn-banner {
		margin: 12px 18px;
		padding: 12px 14px;
		font-size: 0.58rem;
		color: var(--tx);
		background: transparent;
		border: 1px solid var(--br2);
		border-left: 2px solid rgba(255, 140, 100, 0.7);
		border-radius: 6px;
		line-height: 1.45;
	}

	.empty-state {
		padding: 28px 18px;
		text-align: center;
		font-size: 0.65rem;
		color: var(--tx);
	}

	.empty-state .muted {
		margin-top: 8px;
		display: block;
	}

	.meal-section {
		padding: 16px 18px;
		border-bottom: 1px solid var(--br);
		background: transparent;
	}

	.meal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 10px;
	}

	.meal-label {
		font-size: 0.6rem;
		font-weight: 600;
		color: var(--tx);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.meal-time {
		font-size: 0.55rem;
		color: var(--txd);
	}

	.recipe-title-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 10px;
		margin-bottom: 8px;
	}

	.recipe-name {
		margin: 0;
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--g);
		line-height: 1.25;
	}

	.edit-link {
		flex-shrink: 0;
		font-size: 0.55rem;
		font-weight: 600;
		color: var(--cy);
		text-decoration: none;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.badge-manual {
		font-size: 0.52rem;
		color: var(--txd);
		margin: 0 0 8px;
	}

	.desc {
		font-size: 0.58rem;
		color: var(--txd);
		line-height: 1.45;
		margin: 0 0 8px;
	}

	.meta-row {
		display: flex;
		flex-wrap: wrap;
		gap: 10px 14px;
		font-size: 0.54rem;
		color: var(--txd);
		margin-bottom: 10px;
	}

	.allergens {
		font-size: 0.52rem;
		color: var(--g);
		margin: 0 0 10px;
		line-height: 1.4;
	}

	.macros {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 8px;
		margin-bottom: 12px;
	}

	.macro {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 8px 4px;
		background: transparent;
		border: 1px solid var(--br2);
		border-radius: 4px;
	}

	.value {
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--cy);
	}

	.lbl {
		font-size: 0.46rem;
		color: var(--txd);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.portions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.58rem;
		color: var(--txd);
		margin-bottom: 12px;
	}

	.qty-control {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.qty-control button {
		width: 28px;
		height: 28px;
		border: 1px solid var(--br2);
		background: transparent;
		color: var(--tx);
		cursor: pointer;
		font-size: 0.75rem;
		font-weight: 600;
		border-radius: 4px;
		font-family: inherit;
		transition: border-color 0.15s, color 0.15s;
	}

	.qty-control button:active {
		border-color: var(--cy);
		color: var(--cy);
	}

	.qty-control button:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.mult-input {
		width: 48px;
		text-align: center;
		background: transparent;
		border: 1px solid var(--br2);
		color: var(--tx);
		font-size: 0.7rem;
		font-weight: 600;
		font-family: var(--fh);
		padding: 4px 2px;
		border-radius: 3px;
		-moz-appearance: textfield;
		appearance: textfield;
	}
	.mult-input::-webkit-outer-spin-button,
	.mult-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

	.subh {
		margin: 0 0 8px;
		font-size: 0.58rem;
		font-weight: 600;
		color: var(--tx);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.ing-list {
		margin: 0;
		padding-left: 1rem;
		font-size: 0.58rem;
		color: var(--tx);
		line-height: 1.5;
	}

	.ing-list li {
		margin-bottom: 8px;
	}

	.ing-name {
		font-weight: 500;
	}

	.ing-qty {
		display: block;
		color: var(--g);
		margin-top: 2px;
	}

	.opt {
		display: inline-block;
		margin-left: 6px;
		font-size: 0.5rem;
		color: var(--txd);
		text-transform: uppercase;
	}

	.ing-note {
		font-size: 0.52rem;
		color: var(--txd);
		margin-top: 2px;
	}

	.instructions {
		margin: 0;
		padding: 12px;
		font-size: 0.58rem;
		line-height: 1.5;
		color: var(--tx);
		background: transparent;
		border-radius: 6px;
		border: 1px solid var(--br);
		white-space: pre-wrap;
		font-family: inherit;
	}

	.total-section {
		padding: 18px;
		background: transparent;
		border-top: 1px solid var(--br);
	}

	.total-title {
		font-size: 0.65rem;
		font-weight: 600;
		color: var(--g);
		margin-bottom: 12px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-family: var(--fh2), sans-serif;
	}

	.small {
		font-size: 0.52rem;
		margin-top: 10px;
	}
</style>
