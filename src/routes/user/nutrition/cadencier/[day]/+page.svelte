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
		const v = Math.min(9, Math.max(1, Math.round(value)));
		mealMult = { ...mealMult, [mealId]: v };
	}

	function macrosScaled(
		m: DayMealRow,
		mult: number
	): { kcal: number; p: number; c: number; f: number } {
		return {
			kcal: Math.round(m.calories * mult),
			p: Math.round(m.proteinG * mult * 10) / 10,
			c: Math.round(m.carbsG * mult * 10) / 10,
			f: Math.round(m.fatG * mult * 10) / 10
		};
	}

	const dayTotalsLive = $derived.by(() => {
		let kcal = 0;
		let p = 0;
		let c = 0;
		let f = 0;
		for (const m of data.meals) {
			const u = multOf(m.id);
			kcal += m.calories * u;
			p += m.proteinG * u;
			c += m.carbsG * u;
			f += m.fatG * u;
		}
		return {
			kcal: Math.round(kcal),
			p: Math.round(p * 10) / 10,
			c: Math.round(c * 10) / 10,
			f: Math.round(f * 10) / 10
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
	{#each data.meals as meal (meal.id)}
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
			</div>

			<div class="portions">
				<span>Multiplicateur portions (×{u})</span>
				<div class="qty-control">
					<button type="button" onclick={() => setMult(meal.id, u - 1)} disabled={u <= 1}
						>−</button
					>
					<span>{u}</span>
					<button type="button" onclick={() => setMult(meal.id, u + 1)} disabled={u >= 9}
						>+</button
					>
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
		</div>
		{#if data.dayTotals.calories !== dayTotalsLive.kcal}
			<p class="muted small">
				Sans multiplicateur : {data.dayTotals.calories} kcal · P {data.dayTotals.proteinG} g · C
				{data.dayTotals.carbsG} g · L {data.dayTotals.fatG} g
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
		background: #0a0a0a;
		flex-shrink: 0;
		gap: 12px;
		border-bottom: 1px solid rgba(201, 168, 76, 0.15);
	}

	.home-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		text-decoration: none;
		color: #c9a84c;
		font-size: 0.7rem;
		font-weight: 500;
		padding: 6px 10px;
		border-radius: 3px;
		background: rgba(201, 168, 76, 0.1);
		transition: all 0.15s;
	}

	.home-btn:active {
		background: rgba(201, 168, 76, 0.2);
	}

	.page-title {
		font-size: 0.72rem;
		font-weight: 600;
		color: #f0ede8;
		margin-left: auto;
		font-family: 'Bebas Neue', sans-serif;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		text-align: right;
		line-height: 1.2;
		max-width: 62%;
	}

	.section-head {
		padding: 14px 18px;
		background: rgba(201, 168, 76, 0.08);
		border-bottom: 1px solid rgba(201, 168, 76, 0.15);
	}

	.title {
		font-size: 0.7rem;
		font-weight: 600;
		color: #f0ede8;
	}

	.sub {
		font-size: 0.55rem;
		color: rgba(240, 237, 232, 0.55);
		margin-top: 6px;
		line-height: 1.45;
	}

	.targets-card {
		margin: 12px 18px;
		padding: 12px 14px;
		background: rgba(58, 184, 184, 0.1);
		border: 1px solid rgba(58, 184, 184, 0.25);
		border-radius: 6px;
	}

	.targets-title {
		font-size: 0.62rem;
		font-weight: 600;
		color: #3ab8b8;
		margin-bottom: 8px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.targets-list {
		margin: 0;
		padding-left: 1.1rem;
		font-size: 0.58rem;
		color: #f0ede8;
		line-height: 1.55;
	}

	.targets-list li {
		margin-bottom: 4px;
	}

	.muted {
		color: rgba(240, 237, 232, 0.45);
		font-weight: 400;
	}

	.warn-banner {
		margin: 12px 18px;
		padding: 12px 14px;
		font-size: 0.58rem;
		color: #f0ede8;
		background: rgba(201, 100, 76, 0.12);
		border: 1px solid rgba(201, 100, 76, 0.3);
		border-radius: 6px;
		line-height: 1.45;
	}

	.empty-state {
		padding: 28px 18px;
		text-align: center;
		font-size: 0.65rem;
		color: #f0ede8;
	}

	.empty-state .muted {
		margin-top: 8px;
		display: block;
	}

	.meal-section {
		padding: 16px 18px;
		border-bottom: 1px solid rgba(240, 237, 232, 0.08);
		background: #0a0a0a;
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
		color: #f0ede8;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.meal-time {
		font-size: 0.55rem;
		color: rgba(240, 237, 232, 0.5);
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
		color: #c9a84c;
		line-height: 1.25;
	}

	.edit-link {
		flex-shrink: 0;
		font-size: 0.55rem;
		font-weight: 600;
		color: #3ab8b8;
		text-decoration: none;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.badge-manual {
		font-size: 0.52rem;
		color: rgba(240, 237, 232, 0.55);
		margin: 0 0 8px;
	}

	.desc {
		font-size: 0.58rem;
		color: rgba(240, 237, 232, 0.65);
		line-height: 1.45;
		margin: 0 0 8px;
	}

	.meta-row {
		display: flex;
		flex-wrap: wrap;
		gap: 10px 14px;
		font-size: 0.54rem;
		color: rgba(240, 237, 232, 0.5);
		margin-bottom: 10px;
	}

	.allergens {
		font-size: 0.52rem;
		color: rgba(201, 168, 76, 0.85);
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
		background: rgba(58, 184, 184, 0.12);
		border-radius: 4px;
	}

	.value {
		font-size: 0.72rem;
		font-weight: 700;
		color: #3ab8b8;
	}

	.lbl {
		font-size: 0.46rem;
		color: rgba(240, 237, 232, 0.45);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.portions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.58rem;
		color: rgba(240, 237, 232, 0.65);
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
		border: 1px solid rgba(201, 168, 76, 0.35);
		background: rgba(201, 168, 76, 0.12);
		color: #c9a84c;
		cursor: pointer;
		font-size: 0.75rem;
		font-weight: 600;
		border-radius: 4px;
		font-family: inherit;
	}

	.qty-control button:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.subh {
		margin: 0 0 8px;
		font-size: 0.58rem;
		font-weight: 600;
		color: #f0ede8;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.ing-list {
		margin: 0;
		padding-left: 1rem;
		font-size: 0.58rem;
		color: #f0ede8;
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
		color: #c9a84c;
		margin-top: 2px;
	}

	.opt {
		display: inline-block;
		margin-left: 6px;
		font-size: 0.5rem;
		color: rgba(240, 237, 232, 0.4);
		text-transform: uppercase;
	}

	.ing-note {
		font-size: 0.52rem;
		color: rgba(240, 237, 232, 0.45);
		margin-top: 2px;
	}

	.instructions {
		margin: 0;
		padding: 12px;
		font-size: 0.58rem;
		line-height: 1.5;
		color: rgba(240, 237, 232, 0.85);
		background: rgba(240, 237, 232, 0.04);
		border-radius: 6px;
		border: 1px solid rgba(240, 237, 232, 0.08);
		white-space: pre-wrap;
		font-family: inherit;
	}

	.total-section {
		padding: 18px;
		background: rgba(201, 168, 76, 0.06);
		border-top: 1px solid rgba(201, 168, 76, 0.15);
	}

	.total-title {
		font-size: 0.65rem;
		font-weight: 600;
		color: #c9a84c;
		margin-bottom: 12px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-family: 'Bebas Neue', sans-serif;
	}

	.small {
		font-size: 0.52rem;
		margin-top: 10px;
	}
</style>
