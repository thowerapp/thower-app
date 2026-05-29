<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form: formResult } = $props();

	const recipe = $derived(data.recipe);
	let isFavorite = $state(data.isFavorite);

	$effect(() => { isFavorite = data.isFavorite; });

	const categoryLabels: Record<string, string> = {
		BREAKFAST: 'Petit déjeuner',
		MEAL: 'Repas',
		DESSERT: 'Dessert'
	};

	const macros = $derived([
		{ label: 'Kcal', value: recipe.nutritionKcal, unit: '' },
		{ label: 'Protéines', value: recipe.nutritionProteinG, unit: 'g' },
		{ label: 'Glucides', value: recipe.nutritionCarbsG, unit: 'g' },
		{ label: 'Lipides', value: recipe.nutritionFatG, unit: 'g' },
		{ label: 'Fibres', value: recipe.nutritionFiberG, unit: 'g' }
	].filter((m) => m.value != null));
</script>

<div class="u-back-row">
	<a href="/user/nutrition/recettes" class="u-back-lnk">
		<svg width="12" height="12" viewBox="0 0 14 14"><path d="M9 2L4 7l5 5" stroke="var(--txd)" stroke-width="1.5" stroke-linecap="round"/></svg>
		<span class="u-back-lbl">Recettes</span>
	</a>
	<div class="u-back-head">{recipe.name}</div>
</div>

<div class="fiche">

	<!-- En-tête -->
	<div class="fiche-header">
		<div class="fiche-meta">
			<span class="badge">{categoryLabels[recipe.category] ?? recipe.category}</span>
			{#if recipe.totalTimeMin}
				<span class="meta-dot">·</span>
				<span class="meta-time">{recipe.totalTimeMin} min</span>
			{/if}
			{#if recipe.servings && recipe.servings > 1}
				<span class="meta-dot">·</span>
				<span class="meta-time">{recipe.servings} portions</span>
			{/if}
		</div>

		<form method="POST" action="?/toggleFavorite" use:enhance={() => {
			isFavorite = !isFavorite;
			return async ({ update }) => { await update({ reset: false }); };
		}}>
			<button type="submit" class="star-btn" class:starred={isFavorite}>
				{isFavorite ? '★' : '☆'}
			</button>
		</form>
	</div>

	<!-- Description -->
	{#if recipe.description}
		<p class="description">{recipe.description}</p>
	{/if}

	<!-- Macros -->
	{#if macros.length > 0}
		<div class="section-title">Valeurs nutritionnelles</div>
		<div class="macros-grid">
			{#each macros as m}
				<div class="macro-cell">
					<div class="macro-val">{m.value}{m.unit}</div>
					<div class="macro-lbl">{m.label}</div>
				</div>
			{/each}
		</div>
		{#if recipe.referenceYieldG}
			<div class="macro-note">Pour {recipe.referenceYieldG} g ({recipe.servings ?? 1} portion{(recipe.servings ?? 1) > 1 ? 's' : ''})</div>
		{/if}
	{/if}

	<!-- Ingrédients -->
	{#if recipe.ingredients.length > 0}
		<div class="section-title">Ingrédients</div>
		<ul class="ingredients-list">
			{#each recipe.ingredients as ing}
				<li class="ing-item">
					<span class="ing-name">{ing.name}</span>
					{#if ing.quantityG || ing.unit}
						<span class="ing-qty">
							{ing.quantityG ? `${ing.quantityG} g` : ''}{ing.unit && ing.quantityG ? ' · ' : ''}{ing.unit ?? ''}
						</span>
					{/if}
					{#if ing.isOptional}
						<span class="ing-opt">optionnel</span>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	<!-- Instructions -->
	{#if recipe.instructions}
		<div class="section-title">Préparation</div>
		<div class="instructions">{recipe.instructions}</div>
	{/if}

	<!-- Recette perso : lien édition -->
	{#if recipe.isCustom}
		<div class="custom-tag">Recette personnalisée</div>
	{/if}

</div>

<style>
	.fiche {
		padding: 0 0 32px;
	}

	.fiche-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 18px;
		border-bottom: 1px solid var(--br);
		gap: 8px;
	}

	.fiche-meta {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.badge {
		font-size: 0.5rem;
		font-weight: 700;
		font-family: var(--fb);
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--cy);
		border: 1px solid var(--cy);
		padding: 2px 7px;
	}

	.meta-dot {
		color: var(--txd);
		font-size: 0.55rem;
	}

	.meta-time {
		font-size: 0.5rem;
		font-family: var(--fb);
		color: var(--txd);
		letter-spacing: 0.05em;
	}

	.star-btn {
		width: 32px; height: 32px;
		border: none; background: none;
		font-size: 1.1rem;
		color: var(--br2);
		cursor: pointer; padding: 0;
		display: flex; align-items: center; justify-content: center;
		flex-shrink: 0;
		-webkit-tap-highlight-color: transparent;
		transition: color 0.15s;
	}
	.star-btn.starred { color: var(--g); text-shadow: 0 0 8px rgba(201,168,78,.4); }

	.description {
		padding: 12px 18px;
		font-size: 0.5625rem;
		color: var(--txd);
		font-family: var(--fb);
		line-height: 1.55;
		border-bottom: 1px solid var(--br);
		margin: 0;
	}

	.section-title {
		padding: 12px 18px 6px;
		font-size: 0.5rem;
		font-weight: 700;
		font-family: var(--fb);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--txd);
	}

	.macros-grid {
		display: flex;
		gap: 0;
		padding: 0 18px;
		flex-wrap: wrap;
	}

	.macro-cell {
		flex: 1;
		min-width: 60px;
		border: 1px solid var(--br);
		padding: 8px 6px;
		text-align: center;
		margin: 2px;
	}

	.macro-val {
		font-size: 0.75rem;
		font-weight: 700;
		font-family: var(--fb);
		color: var(--tx);
	}

	.macro-lbl {
		font-size: 0.45rem;
		font-family: var(--fb);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--txd);
		margin-top: 2px;
	}

	.macro-note {
		padding: 4px 18px 10px;
		font-size: 0.45rem;
		font-family: var(--fb);
		color: var(--txd);
	}

	.ingredients-list {
		list-style: none;
		padding: 0;
		margin: 0;
		border-top: 1px solid var(--br);
	}

	.ing-item {
		display: flex;
		align-items: baseline;
		gap: 8px;
		padding: 9px 18px;
		border-bottom: 1px solid var(--br);
	}

	.ing-name {
		flex: 1;
		font-size: 0.5625rem;
		font-family: var(--fb);
		color: var(--tx);
	}

	.ing-qty {
		font-size: 0.5rem;
		font-family: var(--fb);
		color: var(--txd);
		flex-shrink: 0;
	}

	.ing-opt {
		font-size: 0.45rem;
		font-family: var(--fb);
		color: var(--txd);
		border: 1px dashed var(--br2);
		padding: 1px 4px;
		flex-shrink: 0;
	}

	.instructions {
		padding: 8px 18px 14px;
		font-size: 0.5625rem;
		font-family: var(--fb);
		color: var(--tx);
		line-height: 1.6;
		white-space: pre-wrap;
		border-top: 1px solid var(--br);
	}

	.custom-tag {
		margin: 16px 18px 0;
		font-size: 0.45rem;
		font-family: var(--fb);
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--txd);
		border: 1px dashed var(--br2);
		display: inline-block;
		padding: 3px 8px;
	}
</style>
