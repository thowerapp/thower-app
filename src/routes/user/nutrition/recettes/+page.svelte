<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();
	const pageData = $derived(data as {
		favoriteRecipes?: Array<{ id: string; name: string; category: string; totalTimeMin: number | null }>;
		customRecipes?: Array<{ id: string; name: string; category: string; totalTimeMin: number | null }>;
		programRecipes?: Array<{ id: string; name: string; category: string; totalTimeMin: number | null }>;
		programDays?: number;
		canCreateRecipe?: boolean;
	});

	type TabKey = 'programme' | 'favoris' | 'mes' | 'nouvelles';
	let activeTab = $state<TabKey>('programme');
	let favorites = $state(new Set<string>());

	$effect(() => {
		favorites = new Set((pageData.favoriteRecipes ?? []).map((r) => r.id));
	});

	function optimisticToggle(id: string) {
		const next = new Set(favorites);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		favorites = next;
	}

	const recipesByTab = $derived.by(() => {
		switch (activeTab) {
			case 'favoris':
				return (pageData.favoriteRecipes ?? []).filter((r) => favorites.has(r.id));
			case 'mes':
				return pageData.customRecipes ?? [];
				case 'nouvelles':
					return [];
			default:
				return pageData.programRecipes ?? [];
		}
	});

	function recipeTimeLabel(recipe: { totalTimeMin: number | null | undefined }): string {
		if (recipe.totalTimeMin == null) return 'Temps non renseigné';
		return `Temps total ${recipe.totalTimeMin} min`;
	}

	const categoryLabels: Record<string, string> = {
		BREAKFAST: 'Petit déjeuner',
		MEAL: 'Repas',
		DESSERT: 'Dessert'
	};
</script>

<div class="u-back-row">
	<a href="/user/nutrition" class="u-back-lnk">
		<svg width="12" height="12" viewBox="0 0 14 14"><path d="M9 2L4 7l5 5" stroke="var(--txd)" stroke-width="1.5" stroke-linecap="round"/></svg>
		<span class="u-back-lbl">Nutrition</span>
	</a>
	<div class="u-back-head">Recettes</div>
</div>

<div class="tabs-section">
	<button class="tab-btn" class:active={activeTab === 'programme'} onclick={() => (activeTab = 'programme')}>
		Programme ({pageData.programRecipes?.length ?? 0})
	</button>
	<button class="tab-btn" class:active={activeTab === 'favoris'} onclick={() => (activeTab = 'favoris')}>
		Favoris ({favorites.size})
	</button>
	<button class="tab-btn" class:active={activeTab === 'mes'} onclick={() => (activeTab = 'mes')}>
		Mes recettes ({pageData.customRecipes?.length ?? 0})
	</button>
	<button
		class="tab-btn"
		class:active={activeTab === 'nouvelles'}
		disabled={!pageData.canCreateRecipe}
		onclick={() => (activeTab = 'nouvelles')}
	>
		{pageData.canCreateRecipe ? 'Nouvelles' : 'Nouvelles 🔒'}
	</button>
</div>

<div class="program-info">
	Cycle nutrition courant: J1 à J{pageData.programDays ?? 91}
</div>

<div class="recipes-list">
	{#if activeTab === 'nouvelles'}
		<div class="empty-state">
			Crée ta recette personnalisée en quelques champs.
		</div>
	{:else if recipesByTab.length === 0}
		<div class="empty-state">Aucune recette pour cet onglet.</div>
	{:else}
		{#each recipesByTab as recipe (recipe.id)}
			<div class="recipe-item">
				<a href="/user/nutrition/recettes/{recipe.id}" class="recipe-link">
					<div class="recipe-icon"><div style="width:10px;height:10px;border:1.5px solid var(--g);opacity:.7"></div></div>
					<div class="recipe-body">
						<div class="recipe-name">{recipe.name}</div>
						<div class="recipe-meta">
							{categoryLabels[recipe.category] ?? recipe.category} • {recipeTimeLabel(recipe)}
						</div>
					</div>
				</a>
				<form
					method="POST"
					action="?/toggleFavorite"
					use:enhance={() => {
						optimisticToggle(recipe.id);
						return async ({ update }) => { await update({ reset: false }); };
					}}
				>
					<input type="hidden" name="recipeId" value={recipe.id} />
					<input type="hidden" name="action" value={favorites.has(recipe.id) ? 'remove' : 'add'} />
					<button type="submit" class="star-btn" class:starred={favorites.has(recipe.id)}>
						{favorites.has(recipe.id) ? '★' : '☆'}
					</button>
				</form>
			</div>
		{/each}
	{/if}
</div>

<div class="create-link">
	{#if pageData.canCreateRecipe}
		<a class="create-open" href="/user/nutrition/recettes/create">+ Créer une recette</a>
	{:else}
		<button class="create-lock" type="button" disabled>
			🔒 Création de recette verrouillée
		</button>
	{/if}
</div>

<style>
	.tabs-section {
		display: flex;
		gap: 6px;
		padding: 10px 18px;
		background: var(--s1);
		overflow-x: auto;
		border-bottom: 1px solid var(--br);
		scrollbar-width: none;
	}
	.tabs-section::-webkit-scrollbar { display: none; }

	.tab-btn {
		flex-shrink: 0;
		padding: 5px 11px;
		border: 1px solid var(--br2);
		background: transparent;
		font-size: 0.5rem;
		font-weight: 600;
		color: var(--txd);
		cursor: pointer;
		font-family: var(--fb);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		-webkit-tap-highlight-color: transparent;
		transition: color 0.15s, border-color 0.15s;
	}
	.tab-btn.active {
		color: var(--cy);
		border-color: var(--cy);
	}
	.tab-btn:disabled { opacity: 0.35; cursor: not-allowed; }

	.program-info {
		padding: 8px 18px;
		font-size: 0.5rem;
		color: var(--txd);
		font-family: var(--fb);
		letter-spacing: 0.06em;
		border-bottom: 1px solid var(--br);
	}

	.recipes-list { display: flex; flex-direction: column; }

	.recipe-item {
		display: flex;
		align-items: center;
		gap: 0;
		border-bottom: 1px solid var(--br);
		-webkit-tap-highlight-color: transparent;
	}

	.recipe-link {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 11px 0 11px 18px;
		text-decoration: none;
		color: inherit;
		-webkit-tap-highlight-color: transparent;
	}

	.recipe-icon {
		width: 34px; height: 34px;
		flex-shrink: 0;
		background: var(--s2);
		border: 1px solid var(--br2);
		display: flex; align-items: center; justify-content: center;
	}

	.recipe-body { flex: 1; min-width: 0; }

	.recipe-name {
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--tx);
		font-family: var(--fb);
	}

	.recipe-meta {
		font-size: 0.5rem;
		color: var(--txd);
		margin-top: 2px;
		font-family: var(--fb);
	}

	.star-btn {
		width: 28px; height: 28px;
		border: none; background: none;
		font-size: 1rem;
		color: var(--br2);
		cursor: pointer; padding: 0;
		display: flex; align-items: center; justify-content: center;
		flex-shrink: 0;
		-webkit-tap-highlight-color: transparent;
		transition: color 0.15s;
	}
	.star-btn.starred {
		color: var(--g);
		text-shadow: 0 0 8px rgba(201,168,78,.4);
	}

	.empty-state {
		padding: 28px 18px;
		font-size: 0.5625rem;
		color: var(--txd);
		text-align: center;
		font-family: var(--fb);
	}

	.create-link {
		padding: 14px 18px;
		border-top: 1px solid var(--br);
		text-align: center;
	}

	.create-lock {
		color: var(--txd);
		font-size: 0.5rem;
		font-weight: 600;
		font-family: var(--fb);
		letter-spacing: 0.06em;
		border: 1px dashed var(--br2);
		padding: 8px 14px;
		background: transparent;
		cursor: not-allowed;
		opacity: 0.45;
	}

	.create-open {
		text-decoration: none;
		color: var(--s1);
		font-size: 0.5rem;
		font-weight: 700;
		font-family: var(--fb);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		border: none;
		padding: 8px 16px;
		background: var(--cy);
		display: inline-block;
		-webkit-tap-highlight-color: transparent;
	}
</style>
