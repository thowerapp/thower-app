<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';

	let { data }: { data: PageData } = $props();

	type Recipe = PageData['recipes'][number];

	let search = $state('');
	let selectedId = $state<string | null>(data.currentRecipeId ?? null);
	let customQty = $state<number | null>(null);
	let saving = $state(false);

	const filtered = $derived(
		search.trim().length === 0
			? data.recipes
			: data.recipes.filter((r) => r.name.toLowerCase().includes(search.trim().toLowerCase()))
	);

	const selected = $derived(data.recipes.find((r) => r.id === selectedId) ?? null);

	const displayQty = $derived(customQty ?? selected?.optimalQuantityG ?? 0);

	function scaledMacro(base: number | null, refYield: number | null, qty: number): number | null {
		if (base == null) return null;
		const ref = refYield != null && refYield > 0 ? refYield : 100;
		return Math.round(base * (qty / ref) * 10) / 10;
	}

	const previewMacros = $derived(
		selected
			? {
					kcal: Math.round(scaledMacro(selected.nutritionKcal, selected.referenceYieldG, displayQty) ?? 0),
					p: scaledMacro(selected.nutritionProteinG, selected.referenceYieldG, displayQty) ?? 0,
					c: scaledMacro(selected.nutritionCarbsG, selected.referenceYieldG, displayQty) ?? 0,
					f: scaledMacro(selected.nutritionFatG, selected.referenceYieldG, displayQty) ?? 0
				}
			: null
	);

	function adjustQty(delta: number) {
		const base = customQty ?? selected?.optimalQuantityG ?? 100;
		customQty = Math.max(10, Math.min(2000, base + delta));
	}

	function selectRecipe(r: Recipe) {
		selectedId = r.id;
		customQty = null;
	}
</script>

<div class="back-row">
	<a href="/user/nutrition/cadencier/{data.dayIndex}" class="back-lnk">← Cadencier</a>
	<div class="back-head">{data.positionLabel}</div>
</div>

{#if data.targetKcal != null || data.targetProteinG != null}
	<div class="targets-bar">
		{#if data.targetKcal != null}
			<span>Cible créneau : <strong>{Math.round(data.targetKcal * data.frac)}</strong> kcal</span>
		{/if}
		{#if data.targetProteinG != null}
			<span><strong>{Math.round(data.targetProteinG * data.frac * 10) / 10}</strong> g prot.</span>
		{/if}
	</div>
{/if}

<div class="search-row">
	<input
		type="search"
		class="search-input"
		placeholder="Rechercher une recette…"
		bind:value={search}
	/>
</div>

<div class="recipe-list">
	{#each filtered as recipe (recipe.id)}
		{@const isFav = data.favoriteIds.includes(recipe.id)}
		{@const isSel = selectedId === recipe.id}
		<button
			type="button"
			class="recipe-row"
			class:selected={isSel}
			onclick={() => selectRecipe(recipe)}
		>
			<div class="recipe-row-body">
				<div class="recipe-row-name">{recipe.name}</div>
				<div class="recipe-row-meta">
					{#if recipe.nutritionKcal != null}
						<span>{Math.round(recipe.nutritionKcal * (recipe.optimalQuantityG / (recipe.referenceYieldG ?? 100)))} kcal</span>
					{/if}
					{#if recipe.totalTimeMin != null}
						<span>· {recipe.totalTimeMin} min</span>
					{/if}
				</div>
			</div>
			{#if isFav}<span class="fav-dot">★</span>{/if}
			{#if isSel}<span class="sel-check">✓</span>{/if}
		</button>
	{/each}
	{#if filtered.length === 0}
		<p class="empty">Aucune recette trouvée.</p>
	{/if}
</div>

{#if selected}
	<div class="selected-panel">
		<div class="panel-title">{selected.name}</div>

		<div class="qty-row">
			<span class="qty-label">Quantité</span>
			<div class="qty-ctrl">
				<button type="button" class="qty-btn" onclick={() => adjustQty(-10)}>−10g</button>
				<span class="qty-val">{displayQty} g</span>
				<button type="button" class="qty-btn" onclick={() => adjustQty(10)}>+10g</button>
			</div>
			{#if customQty != null}
				<button type="button" class="qty-reset" onclick={() => (customQty = null)}>Réinitialiser</button>
			{/if}
		</div>

		{#if previewMacros}
			<div class="macros">
				<div class="macro"><div class="mv">{previewMacros.kcal}</div><div class="ml">kcal</div></div>
				<div class="macro"><div class="mv">{previewMacros.p}g</div><div class="ml">Prot.</div></div>
				<div class="macro"><div class="mv">{previewMacros.c}g</div><div class="ml">Gluc.</div></div>
				<div class="macro"><div class="mv">{previewMacros.f}g</div><div class="ml">Lip.</div></div>
			</div>
		{/if}

		<form
			method="POST"
			action="?/save"
			use:enhance={() => {
				saving = true;
				return async ({ update }) => { saving = false; await update(); };
			}}
		>
			<input type="hidden" name="recipeId" value={selected.id} />
			<input type="hidden" name="quantityG" value={displayQty} />
			<button type="submit" class="btn-save" disabled={saving}>
				{saving ? 'Enregistrement…' : 'Valider cette recette →'}
			</button>
		</form>
	</div>
{/if}

<style>
	.back-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		border-bottom: 1px solid var(--br);
	}
	.back-lnk {
		font-size: 0.65rem;
		font-weight: 500;
		color: var(--txd);
		text-decoration: none;
		padding: 6px 10px;
		border: 1px solid var(--br2);
		border-radius: 3px;
	}
	.back-head {
		font-size: 0.7rem;
		font-weight: 800;
		color: var(--tx);
		font-family: var(--fh), sans-serif;
		text-transform: uppercase;
		letter-spacing: -0.05em;
	}

	.targets-bar {
		display: flex;
		gap: 12px;
		padding: 8px 16px;
		background: transparent;
		border-bottom: 1px solid var(--br);
		font-size: 0.55rem;
		color: var(--txd);
	}
	.targets-bar strong { color: var(--cy); }

	.search-row {
		padding: 10px 16px;
		border-bottom: 1px solid var(--br);
	}
	.search-input {
		width: 100%;
		padding: 8px 10px;
		background: transparent;
		border: 1px solid var(--br2);
		color: var(--tx);
		font-size: 0.62rem;
		font-family: inherit;
		border-radius: 4px;
		box-sizing: border-box;
	}
	.search-input::placeholder { color: var(--txd); }

	.recipe-list {
		overflow-y: auto;
		max-height: 40vh;
		border-bottom: 1px solid var(--br);
	}
	.recipe-row {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 11px 16px;
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--br);
		text-align: left;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	.recipe-row:active { background: rgba(200,164,74,.05); }
	.recipe-row.selected { border-left: 2px solid var(--g); background: rgba(200,164,74,.04); }
	.recipe-row-body { flex: 1; min-width: 0; }
	.recipe-row-name { font-size: 0.64rem; font-weight: 500; color: var(--tx); }
	.recipe-row-meta { font-size: 0.52rem; color: var(--txd); margin-top: 2px; display: flex; gap: 4px; }
	.fav-dot { font-size: 0.7rem; color: #ffb800; }
	.sel-check { font-size: 0.7rem; color: var(--cy); font-weight: 700; }
	.empty { padding: 16px; font-size: 0.58rem; color: var(--txd); text-align: center; margin: 0; }

	.selected-panel {
		padding: 14px 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.panel-title {
		font-size: 0.7rem;
		font-weight: 700;
		color: var(--g);
		font-family: var(--fh), sans-serif;
	}

	.qty-row {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}
	.qty-label { font-size: 0.55rem; color: var(--txd); }
	.qty-ctrl { display: flex; align-items: center; gap: 8px; }
	.qty-btn {
		padding: 5px 10px;
		background: transparent;
		border: 1px solid var(--br2);
		color: var(--tx);
		font-size: 0.58rem;
		font-weight: 600;
		border-radius: 3px;
		cursor: pointer;
		font-family: inherit;
	}
	.qty-btn:active { border-color: var(--cy); color: var(--cy); }
	.qty-val { font-size: 0.7rem; font-weight: 700; color: var(--cy); min-width: 52px; text-align: center; }
	.qty-reset { font-size: 0.5rem; color: var(--txd); background: none; border: none; cursor: pointer; text-decoration: underline; padding: 0; font-family: inherit; }

	.macros {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 6px;
	}
	.macro {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 8px 4px;
		border: 1px solid var(--br2);
		border-radius: 4px;
	}
	.mv { font-size: 0.7rem; font-weight: 700; color: var(--cy); }
	.ml { font-size: 0.44rem; color: var(--txd); text-transform: uppercase; letter-spacing: 0.04em; }

	.btn-save {
		width: 100%;
		padding: 12px;
		background: var(--g);
		border: none;
		color: var(--s1);
		font-size: 0.62rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		border-radius: 4px;
		cursor: pointer;
		font-family: var(--fh), sans-serif;
		transition: opacity 0.15s;
	}
	.btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
	.btn-save:active { opacity: 0.85; }
</style>
