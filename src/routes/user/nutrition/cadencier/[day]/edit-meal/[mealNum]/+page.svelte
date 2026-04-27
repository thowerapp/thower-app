<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/stores';

	let { data } = $props<{ data: PageData }>();

	let dayNum = $derived(parseInt($page.params.day as string) || 21);
	let mealNum = $derived(parseInt($page.params.mealNum as string) || 1);
	let dayName = $derived(['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][(dayNum - 1) % 7]);
	let mealLabel = $derived(mealNum === 1 ? 'Déjeuner' : 'Dîner');
	let mealTime = $derived(mealNum === 1 ? '12h30' : '19h00');

	let quantities = 1;
	let selectedRecipe: 'salad' | 'chicken' | 'pasta' = 'salad';

	// Mock recipes library
	const recipes = {
		salad: {
			name: 'Salade niçoise revisitée',
			ingredients: ['Endives', 'Thon', 'Tomates cerises', 'Olives'],
			macros: { calories: 380, protein: 32, carbs: 18, fat: 14 }
		},
		chicken: {
			name: 'Poulet rôti',
			ingredients: ['Poulet fermier', 'Citron', 'Thym', 'Huile d\'olive'],
			macros: { calories: 420, protein: 48, carbs: 8, fat: 16 }
		},
		pasta: {
			name: 'Pâtes complet sauce tomate',
			ingredients: ['Pâtes complètes', 'Tomates', 'Oignon', 'Ail'],
			macros: { calories: 410, protein: 16, carbs: 65, fat: 8 }
		}
	} as const;

	let currentRecipe = $derived(recipes[selectedRecipe]);
	let calculatedMacros = $derived({
		calories: Math.round(currentRecipe.macros.calories * quantities),
		protein: Math.round(currentRecipe.macros.protein * quantities),
		carbs: Math.round(currentRecipe.macros.carbs * quantities),
		fat: Math.round(currentRecipe.macros.fat * quantities)
	});

	function goBack() {
		history.back();
	}
</script>

<div class="header-bar">
	<button type="button" class="back-btn" onclick={goBack}>← Retour</button>
	<div class="header-title">{mealLabel}</div>
</div>

<div class="info-section">
	<div class="info-day">{dayName.charAt(0).toUpperCase() + dayName.slice(1)} {dayNum}</div>
	<div class="info-time">{mealTime}</div>
</div>

<div class="section-block">
	<div class="section-title">Sélectionner une recette</div>
	<div class="recipe-buttons">
		{#each Object.entries(recipes) as [key, recipe] (key)}
			<button 
				type="button"
				class="recipe-btn"
				class:active={selectedRecipe === key}
				onclick={() => selectedRecipe = key as 'salad' | 'chicken' | 'pasta'}
			>
				<div class="recipe-btn-name">{recipe.name}</div>
				<div class="recipe-btn-macros">{recipe.macros.calories} kcal</div>
			</button>
		{/each}
	</div>
</div>

<div class="section-block">
	<div class="section-title">Ingrédients</div>
	<div class="ingredients-list">
		{#each currentRecipe.ingredients as ingredient}
			<div class="ingredient-item">
				<div class="ingredient-dot"></div>
				<div class="ingredient-name">{ingredient}</div>
			</div>
		{/each}
	</div>
</div>

<div class="section-block">
	<div class="section-title">Portions</div>
	<div class="portions-control">
		<button type="button" class="qty-btn" onclick={() => quantities = Math.max(1, quantities - 1)}>−</button>
		<div class="qty-display">
			<div class="qty-value">{quantities}</div>
			<div class="qty-label">portion{quantities > 1 ? 's' : ''}</div>
		</div>
		<button type="button" class="qty-btn" onclick={() => quantities = Math.min(9, quantities + 1)}>+</button>
	</div>
</div>

<div class="macros-section">
	<div class="section-title">Valeur nutritionnelle</div>
	<div class="macros-grid">
		<div class="macro-card">
			<div class="macro-icon">🔥</div>
			<div class="macro-value">{calculatedMacros.calories}</div>
			<div class="macro-label">kcal</div>
		</div>
		<div class="macro-card">
			<div class="macro-icon">💪</div>
			<div class="macro-value">{calculatedMacros.protein}g</div>
			<div class="macro-label">Protéines</div>
		</div>
		<div class="macro-card">
			<div class="macro-icon">🌾</div>
			<div class="macro-value">{calculatedMacros.carbs}g</div>
			<div class="macro-label">Glucides</div>
		</div>
		<div class="macro-card">
			<div class="macro-icon">🧈</div>
			<div class="macro-value">{calculatedMacros.fat}g</div>
			<div class="macro-label">Lipides</div>
		</div>
	</div>
</div>

<div class="action-bar">
	<button type="button" class="btn-secondary">Supprimer</button>
	<button type="button" class="btn-primary">Valider</button>
</div>

<style>
	.header-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		background: transparent;
		border-bottom: 1px solid var(--br);
		flex-shrink: 0;
	}

	.back-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		background: transparent;
		border: 1px solid var(--br2);
		color: var(--txd);
		font-size: 0.65rem;
		font-weight: 500;
		padding: 6px 10px;
		border-radius: 3px;
		cursor: pointer;
		transition: color 0.15s;
	}

	.back-btn:active {
		color: var(--tx);
	}

	.header-title {
		font-size: 0.7rem;
		font-weight: 800;
		color: var(--tx);
		font-family: var(--fh), sans-serif;
		text-transform: uppercase;
		letter-spacing: -0.05em;
	}

	.info-section {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 16px;
		background: transparent;
		border-bottom: 1px solid var(--br);
	}

	.info-day {
		font-size: 0.65rem;
		font-weight: 600;
		color: var(--tx);
		font-family: var(--fh), sans-serif;
	}

	.info-time {
		font-size: 0.56rem;
		color: var(--cy);
		font-family: var(--fh), sans-serif;
	}

	.section-block {
		padding: 14px 16px;
		border-bottom: 1px solid var(--br);
	}

	.section-title {
		font-size: 0.62rem;
		font-weight: 800;
		color: var(--g);
		text-transform: uppercase;
		letter-spacing: -0.04em;
		margin-bottom: 10px;
		font-family: var(--fh), sans-serif;
	}

	.recipe-buttons {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.recipe-btn {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10px 12px;
		background: transparent;
		border: 1px solid var(--br2);
		border-radius: 4px;
		cursor: pointer;
		transition: border-color 0.15s;
	}

	.recipe-btn:active {
		border-color: var(--cy);
	}

	.recipe-btn.active {
		background: transparent;
		border-color: var(--g);
	}

	.recipe-btn-name {
		font-size: 0.64rem;
		font-weight: 500;
		color: var(--tx);
		text-align: left;
	}

	.recipe-btn-macros {
		font-size: 0.56rem;
		color: var(--cy);
		font-weight: 600;
	}

	.ingredients-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.ingredient-item {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.64rem;
		color: var(--tx);
	}

	.ingredient-dot {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: var(--g);
		flex-shrink: 0;
	}

	.portions-control {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.qty-btn {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: 1px solid var(--br2);
		color: var(--tx);
		font-size: 1.2rem;
		font-weight: 700;
		border-radius: 4px;
		cursor: pointer;
		transition: border-color 0.15s, color 0.15s;
	}

	.qty-btn:active {
		border-color: var(--cy);
		color: var(--cy);
	}

	.qty-display {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}

	.qty-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--tx);
	}

	.qty-label {
		font-size: 0.52rem;
		color: var(--txd);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		font-family: var(--fh), sans-serif;
	}

	.macros-section {
		padding: 14px 16px;
		border-bottom: 1px solid var(--br);
	}

	.macros-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 10px;
	}

	.macro-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 12px 8px;
		background: transparent;
		border: 1px solid var(--br2);
		border-radius: 4px;
	}

	.macro-icon {
		font-size: 1.4rem;
	}

	.macro-value {
		font-size: 1rem;
		font-weight: 700;
		color: var(--cy);
	}

	.macro-label {
		font-size: 0.5rem;
		color: var(--txd);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		text-align: center;
		font-family: var(--fh), sans-serif;
	}

	.action-bar {
		display: flex;
		gap: 8px;
		padding: 12px 16px;
		background: transparent;
		border-top: 1px solid var(--br);
	}

	.btn-secondary {
		flex: 1;
		padding: 10px 12px;
		background: transparent;
		border: 1px solid var(--br2);
		color: var(--tx);
		font-size: 0.62rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		border-radius: 4px;
		cursor: pointer;
		transition: border-color 0.15s;
		font-family: var(--fh), sans-serif;
	}

	.btn-secondary:active {
		border-color: var(--tx);
	}

	.btn-primary {
		flex: 1;
		padding: 10px 12px;
		background: var(--g);
		border: none;
		color: var(--s1);
		font-size: 0.62rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		border-radius: 4px;
		cursor: pointer;
		transition: opacity 0.15s;
		font-family: var(--fh), sans-serif;
	}

	.btn-primary:active {
		opacity: 0.85;
	}
</style>
