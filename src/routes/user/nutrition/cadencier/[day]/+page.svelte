<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/stores';

	export let data: PageData;

	$: dayNum = parseInt($page.params.day as string) || 21;
	$: dayName = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][(dayNum - 1) % 7];

	let quantities = { meal1: 1, meal2: 1 };
	let selectedRecipes = { meal1: 'salad', meal2: '' };

	function calculateMacros(quantity: number) {
		return {
			calories: Math.round(380 * quantity),
			protein: Math.round(32 * quantity),
			carbs: Math.round(18 * quantity),
			fat: Math.round(14 * quantity)
		};
	}

	function calculateTotal() {
		const macro1 = calculateMacros(quantities.meal1);
		const macro2 = calculateMacros(quantities.meal2);
		return {
			calories: macro1.calories + macro2.calories,
			protein: macro1.protein + macro2.protein,
			carbs: macro1.carbs + macro2.carbs,
			fat: macro1.fat + macro2.fat
		};
	}
</script>

<div class="back-row">
	<a href="/user" class="home-btn">← Accueil</a>
	<div class="page-title">{dayName.charAt(0).toUpperCase() + dayName.slice(1)} {dayNum}</div>
</div>

<div class="section-head">
	<div class="title">Planifier mes repas</div>
	<div class="sub">Choisisz une recette pour chaque repas</div>
</div>

<div class="meal-section">
	<div class="meal-header">REPAS 1 <span class="meal-time">Déjeuner · 12h30</span></div>
	<button class="generate-btn">Générer une recette</button>

	<div class="recipe-select">
		<select bind:value={selectedRecipes.meal1}>
			<option value="">— Ou choisir manuellement —</option>
			<option value="salad">Salade niçoise revisitée</option>
			<option value="poulet">Poulet rôti</option>
		</select>
	</div>

	{#if selectedRecipes.meal1 === 'salad'}
		{@const m1 = calculateMacros(quantities.meal1)}
		<div class="recipe-details">
			<div class="ingredients">
				Endives · Thon · Tomates cerises · Olives
			</div>

			<div class="macros">
				<div class="macro">
					<div class="value">{m1.calories}</div>
					<div class="label">KCAL</div>
				</div>
				<div class="macro">
					<div class="value">{m1.protein}g</div>
					<div class="label">PROTÉINES</div>
				</div>
				<div class="macro">
					<div class="value">{m1.carbs}g</div>
					<div class="label">GLUCIDES</div>
				</div>
				<div class="macro">
					<div class="value">{m1.fat}g</div>
					<div class="label">LIPIDES</div>
				</div>
			</div>

			<div class="portions">
				<span>Portions</span>
				<div class="qty-control">
					<button on:click={() => quantities.meal1 = Math.max(1, quantities.meal1 - 1)}>−</button>
					<span>{quantities.meal1}</span>
					<button on:click={() => quantities.meal1 = Math.min(9, quantities.meal1 + 1)}>+</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<div class="meal-section">
	<div class="meal-header">REPAS 2 <span class="meal-time">Dîner · 19h00</span></div>
	<button class="generate-btn">Générer une recette</button>

	<div class="recipe-select">
		<select bind:value={selectedRecipes.meal2}>
			<option value="">— Ou choisir manuellement —</option>
			<option value="poulet">Poulet rôti</option>
			<option value="salad">Salade niçoise revisitée</option>
		</select>
	</div>

	{#if selectedRecipes.meal2}
		{@const m2 = calculateMacros(quantities.meal2)}
		<div class="recipe-details">
			<div class="ingredients">
				Poulet fermier · Riz complet · Brocoli
			</div>

			<div class="macros">
				<div class="macro">
					<div class="value">{m2.calories}</div>
					<div class="label">KCAL</div>
				</div>
				<div class="macro">
					<div class="value">{m2.protein}g</div>
					<div class="label">PROTÉINES</div>
				</div>
				<div class="macro">
					<div class="value">{m2.carbs}g</div>
					<div class="label">GLUCIDES</div>
				</div>
				<div class="macro">
					<div class="value">{m2.fat}g</div>
					<div class="label">LIPIDES</div>
				</div>
			</div>

			<div class="portions">
				<span>Portions</span>
				<div class="qty-control">
					<button on:click={() => quantities.meal2 = Math.max(1, quantities.meal2 - 1)}>−</button>
					<span>{quantities.meal2}</span>
					<button on:click={() => quantities.meal2 = Math.min(9, quantities.meal2 + 1)}>+</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<div class="total-section">
	<div class="title">Total du jour</div>
	{#if true}
		{@const totals = calculateTotal()}
		<div class="macros">
			<div class="macro">
				<div class="value">{totals.calories}</div>
				<div class="label">KCAL</div>
			</div>
			<div class="macro">
				<div class="value">{totals.protein}g</div>
				<div class="label">PROTÉINES</div>
			</div>
			<div class="macro">
				<div class="value">{totals.carbs}g</div>
				<div class="label">GLUCIDES</div>
			</div>
			<div class="macro">
				<div class="value">{totals.fat}g</div>
				<div class="label">LIPIDES</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.back-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 18px;
		background: #111;
		flex-shrink: 0;
		gap: 12px;
	}

	.back-link {
		display: flex;
		align-items: center;
		gap: 6px;
		text-decoration: none;
		color: #aaa;
		font-size: 0.65rem;
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

	.home-btn:active {
		background: rgba(255, 255, 255, 0.2);
	}

	.back-arrow {
		font-size: 0.8rem;
	}

	.page-title {
		font-size: 0.75rem;
		font-weight: 700;
		color: #fff;
		margin-left: auto;
	}

	.section-head {
		padding: 14px 18px;
		background: #f5f5f5;
		border-bottom: 1px solid #eee;
	}

	.title {
		font-size: 0.7rem;
		font-weight: 600;
		color: #111;
	}

	.sub {
		font-size: 0.55rem;
		color: #888;
		margin-top: 2px;
	}

	.meal-section {
		padding: 14px 18px;
		border-bottom: 1px solid #eee;
	}

	.meal-header {
		font-size: 0.65rem;
		font-weight: 600;
		color: #111;
		display: flex;
		justify-content: space-between;
		margin-bottom: 8px;
	}

	.meal-time {
		font-size: 0.55rem;
		color: #888;
		font-weight: 400;
	}

	.generate-btn {
		width: 100%;
		padding: 8px;
		background: #111;
		color: #fff;
		border: none;
		border-radius: 2px;
		font-size: 0.6rem;
		font-weight: 600;
		cursor: pointer;
		margin-bottom: 8px;
		font-family: inherit;
		letter-spacing: 0.02em;
	}

	.recipe-select {
		margin-bottom: 10px;
	}

	.recipe-select select {
		width: 100%;
		padding: 6px 8px;
		font-size: 0.6rem;
		border: 1px solid #ddd;
		background: #fff;
		font-family: inherit;
		cursor: pointer;
	}

	.recipe-details {
		padding: 10px 0;
	}

	.ingredients {
		font-size: 0.6rem;
		color: #333;
		margin-bottom: 10px;
	}

	.macros {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 8px;
		margin-bottom: 10px;
	}

	.macro {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}

	.value {
		font-size: 0.68rem;
		font-weight: 600;
		color: #111;
	}

	.label {
		font-size: 0.48rem;
		color: #888;
		font-weight: 500;
		text-align: center;
	}

	.portions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.6rem;
		color: #666;
	}

	.qty-control {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.qty-control button {
		width: 24px;
		height: 24px;
		border: 1px solid #ddd;
		background: #fff;
		cursor: pointer;
		font-size: 0.6rem;
		font-weight: 600;
		border-radius: 2px;
		font-family: inherit;
	}

	.qty-control span {
		min-width: 20px;
		text-align: center;
	}

	.total-section {
		padding: 14px 18px;
	}

	.total-section .title {
		margin-bottom: 10px;
	}
</style>
