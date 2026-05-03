<script lang="ts">
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

	function toggleFavorite(id: string) {
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

<div class="back-row">
	<a href="/user/nutrition" class="home-btn">← Nutrition</a>
	<div class="page-title">Recettes du programme</div>
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
				<div class="recipe-icon">⬛</div>
				<div class="recipe-body">
					<div class="recipe-name">{recipe.name}</div>
					<div class="recipe-meta">
						{categoryLabels[recipe.category] ?? recipe.category} • {recipeTimeLabel(recipe)}
					</div>
				</div>
				<button
					type="button"
					class="star-btn"
					class:starred={favorites.has(recipe.id)}
					onclick={(e) => {
						e.preventDefault();
						toggleFavorite(recipe.id);
					}}
				>
					{favorites.has(recipe.id) ? '★' : '☆'}
				</button>
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
	.back-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		background: #111;
		gap: 12px;
	}

	.home-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		text-decoration: none;
		color: #fff;
		font-size: 0.7rem;
		font-weight: 500;
		padding: 6px 10px;
		border-radius: 3px;
		background: rgba(255, 255, 255, 0.1);
		transition: all 0.15s;
	}

	.page-title {
		font-size: 0.72rem;
		font-weight: 600;
		color: #fff;
		margin-left: auto;
	}

	.tabs-section {
		display: flex;
		gap: 8px;
		padding: 12px;
		background: #f5f5f5;
		overflow-x: auto;
		flex-wrap: wrap;
		border-bottom: 1px solid #eee;
	}

	.tab-btn {
		flex-shrink: 0;
		padding: 6px 12px;
		border: 1px solid #ddd;
		background: #fff;
		border-radius: 3px;
		font-size: 0.55rem;
		font-weight: 500;
		color: #666;
		cursor: pointer;
		font-family: inherit;
	}

	.tab-btn.active {
		background: #111;
		color: #fff;
		border-color: #111;
	}

	.tab-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.program-info {
		padding: 10px 16px;
		font-size: 0.6rem;
		color: #666;
		border-bottom: 1px solid #eee;
	}

	.recipes-list {
		display: flex;
		flex-direction: column;
	}

	.recipe-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 16px;
		border-bottom: 1px solid #f0f0f0;
		text-decoration: none;
		color: inherit;
	}

	.recipe-icon {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #ddd;
		font-size: 0.8rem;
		border-radius: 2px;
		color: #999;
	}

	.recipe-body {
		flex: 1;
		min-width: 0;
	}

	.recipe-name {
		font-size: 0.66rem;
		font-weight: 500;
		color: var(--tx);
	}

	.recipe-meta {
		font-size: 0.54rem;
		color: #888;
		margin-top: 2px;
	}

	.star-btn {
		width: 24px;
		height: 24px;
		border: none;
		background: none;
		font-size: 0.9rem;
		color: #bbb;
		cursor: pointer;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.star-btn.starred {
		color: #ffb800;
	}

	.empty-state {
		padding: 24px 16px;
		font-size: 0.62rem;
		color: #777;
		text-align: center;
	}

	.create-link {
		padding: 14px 16px;
		border-top: 1px solid #eee;
		text-align: center;
	}

	.create-lock {
		text-decoration: none;
		color: #999;
		font-size: 0.64rem;
		font-weight: 500;
		border: 1px dashed #bbb;
		padding: 8px 12px;
		background: #f7f7f7;
		cursor: not-allowed;
	}

	.create-open {
		text-decoration: none;
		color: #111;
		font-size: 0.64rem;
		font-weight: 600;
		border: 1px solid #111;
		padding: 8px 12px;
		background: #fff;
		display: inline-block;
	}
</style>
